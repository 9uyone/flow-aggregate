using Hangfire;
using Hangfire.Mongo;
using Hangfire.Mongo.Migration.Strategies;
using Hangfire.Mongo.Migration.Strategies.Backup;

namespace SchedulerService;

public static class ServiceCollectionExtensions {
	public static void AddAppHangfire(this IServiceCollection services) {
		var storageOptions = new MongoStorageOptions {
			MigrationOptions = new MongoMigrationOptions {
				MigrationStrategy = new MigrateMongoMigrationStrategy(),
				BackupStrategy = new NoneMongoBackupStrategy()
			},
			SlidingInvisibilityTimeout = TimeSpan.FromMinutes(30),

			// MongoDB standalone doesn't support change streams; use tailing strategy instead.
			CheckQueuedJobsStrategy = CheckQueuedJobsStrategy.TailNotificationsCollection
		};

		services.AddHangfire((sp, config) => {
			var client = sp.GetRequiredService<MongoDB.Driver.IMongoClient>();
			config
				.UseRecommendedSerializerSettings()
				.UseSimpleAssemblyNameTypeSerializer()
				.UseMongoStorage(client.Settings, "hangfire", storageOptions);
		});

		// worker that processes jobs
		services.AddHangfireServer();
	}
}