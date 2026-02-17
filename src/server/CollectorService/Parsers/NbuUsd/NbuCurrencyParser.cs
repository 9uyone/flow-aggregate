using Common.Attributes;
using Common.Constants;
using Common.Enums;
using Common.Extensions;
using Common.Interfaces.Parser;
using Common.Contracts.Parser;

namespace CollectorService.Parsers.NbuUsd;

[ParserInfo("nbuExchangeRate", "NBU Currency Exchange Rates", DataType.Currency, "Parses currency exchange rates to UAH from the National Bank of Ukraine")]
[ParserParameter("valcode", "Requested currency\nBy default is USD", false)]
[ParserParameter("date", "Requested date in format YYYYMMDD.\nBy default is current", false)]
public class NbuCurrencyParser(IHttpRestClient httpClient, ILogger<NbuCurrencyParser> logger) : IDataParser {
	public async Task<IEnumerable<ParserDataPayload>> ParseAsync(IDictionary<string, string>? parameters) {
		var valcode = parameters.GetValueOrDefault("valcode", "USD");
		var date = parameters.GetValueOrCompute("date", () => DateTime.UtcNow.ToString("yyyyMMdd"));

		var url = $"https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?valcode={valcode}&date={date}&json";
		var rates = await httpClient.GetAsync<List<NbuRateModel>>(url);
		var rate = rates?.FirstOrDefault();

		if (rate == null) throw new Exception("Failed to fetch NBU rate");

		return [new ParserDataPayload {
			Source = "bank.gov.ua",
			Metric = $"{valcode.ToUpper()}_UAH",
			Value = rate.Rate,
			Metadata = new Dictionary<string, string>
			{
				["exchangeDate"] = rate.ExchangeDate,
				[MetadataKeys.Unit] = "UAH per " + valcode.ToUpper(),
				[MetadataKeys.Provider] = "National bank of Ukraine"
			}
		}];
	}

	public async Task<IEnumerable<LookupOptionDto>> GetParameterLookupsAsync(string parameterName) {
		if (parameterName == "valcode") {
			var rates = await httpClient.GetAsync<List<NbuRateModel>>("https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json");
			if (rates == null) return Enumerable.Empty<LookupOptionDto>();

			return rates
				.OrderBy(r => r.CurrencyCode)
				.Select(r => new LookupOptionDto(
					Value: r.CurrencyCode,
					Label: $"{r.CurrencyName} ({r.CurrencyCode})"));
		}

		return Enumerable.Empty<LookupOptionDto>();
	}
}