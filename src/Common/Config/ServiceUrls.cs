namespace Common.Config;

/*public record ServiceUrls {
    int CollectorHost { get; init; }
    int ProcessorUrl { get; init; }
}
*/

public record ServiceUrls(
    string CollectorHost,
    int CollectorPort,

    string ProcessorHost,
    int ProcessorPort
);