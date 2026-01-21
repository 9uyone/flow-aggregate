using Common.Interfaces;
using Common.Repositories;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using MongoDB.Bson.Serialization.Serializers;
using MongoDB.Driver;
using System.Text.Encodings.Web;

namespace Common.Extensions;

public static class MognoExtensions {
	public static IServiceCollection AddAppMongo(this IServiceCollection services, IConfiguration config) {
		BsonSerializer.RegisterSerializer(new GuidSerializer(GuidRepresentation.Standard));

		var urlEnc = UrlEncoder.Create();

		var user = urlEnc.Encode(config["Mongo:Username"]);
		var pass = urlEnc.Encode(config["Mongo:Password"]);
		var host = config["Mongo:Host"] ?? "localhost";
		var port = config["Mongo:Port"] ?? "27017";

		var connectionString = $"mongodb://{user}:{pass}@{host}:{port}";

		var client = new MongoClient(connectionString);
		services.AddSingleton<IMongoClient>(client);

		var dbName = config["Mongo:Database"] ?? "DiplomaDB";
		services.AddScoped(sp => sp.GetRequiredService<IMongoClient>().GetDatabase(dbName));

		return services;
	}

	public static IServiceCollection AddAppMongoRepository<T>(this IServiceCollection services, string collectionName) where T : class {
		services.AddScoped<IMongoRepository<T>>(sp =>
		{
			var database = sp.GetRequiredService<IMongoDatabase>();
			return new MongoRepository<T>(database, collectionName);
		});
		return services;
	}
}
