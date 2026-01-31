using Common.Interfaces;
using Common.Repositories;
using Microsoft.Extensions.Caching.Distributed;
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

		var section = config.GetSection("Mongo");
		var user = urlEnc.Encode(section["User"]);
		var pass = urlEnc.Encode(section["Pass"]);
		var host = section["Host"] ?? "localhost";
		var port = section["Port"] ?? "27017";

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

	public static IServiceCollection AddCachedMongoRepository<T>(this IServiceCollection services, string collectionName) where T : class {
		// 1. Реєструємо звичайну Монгу (але не як інтерфейс, а як конкретний клас)
		services.AddScoped<MongoRepository<T>>(sp => {
			var database = sp.GetRequiredService<IMongoDatabase>();
			return new MongoRepository<T>(database, collectionName);
		});

		// 2. Реєструємо наш кешований інтерфейс, який "ковтає" Монгу всередину
		services.AddScoped<IMongoRepository<T>>(sp => {
			var mongoRepo = sp.GetRequiredService<MongoRepository<T>>();
			var cache = sp.GetRequiredService<IDistributedCache>();
			return new CachedMongoRepository<T>(mongoRepo, cache);
		});

		return services;
	}
}
