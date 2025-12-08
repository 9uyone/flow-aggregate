namespace Common.Config;

public record ServiceUrls(
    string CollectorHost,
    int CollectorPort,

    string ProcessorHost,
    int ProcessorPort
);