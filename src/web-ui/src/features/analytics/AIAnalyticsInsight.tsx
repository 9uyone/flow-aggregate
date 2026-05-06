import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  Stack,
  Alert,
  Box,
  useTheme,
  Skeleton,
  Button,
} from "@mui/material";
import { AutoAwesome as SparklesIcon } from "@mui/icons-material";
import { analyzeApi, type AnalyticsQueryInput } from "../../api";
import ReactMarkdown from "react-markdown";

interface AIAnalyticsInsightProps {
  parserSlug: string | null;
  queryParams: AnalyticsQueryInput | null;
}

export const AIAnalyticsInsight: React.FC<AIAnalyticsInsightProps> = ({
  parserSlug,
  queryParams,
}) => {
  const theme = useTheme();
  const hasRequiredInputs = Boolean(parserSlug && queryParams);

  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAiSummary(null);
    setError(null);
    setIsLoading(false);
  }, [parserSlug, queryParams]);

  const handleGenerateInsight = async () => {
    if (!hasRequiredInputs || !parserSlug || !queryParams) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await analyzeApi.getParserAiSummary(parserSlug, queryParams);
      setAiSummary(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch AI insights";
      setError(message);
      setAiSummary(null);
    } finally {
      setIsLoading(false);
    }
  };

  if (!hasRequiredInputs) {
    return null;
  }

  const gradientBorder = `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`;

  return (
    <Card
      sx={{
        position: "relative",
        overflow: "hidden",
          borderRadius: 2,
        "&::before": {
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          padding: "2px",
          background: gradientBorder,
          WebkitMask:
            "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
          pointerEvents: "none",
        },
      }}
    >
      <CardHeader
        avatar={
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: `linear-gradient(135deg, ${theme.palette.primary.main}22 0%, ${theme.palette.secondary.main}22 100%)`,
            }}
          >
            <SparklesIcon sx={{ fontSize: 20, color: "primary.main" }} />
          </Box>
        }
        title="AI Analytics Insight"
        subheader="AI-generated insights from Gemini"
        sx={{ pb: 1.5 }}
      />
      <CardContent sx={{ pt: 0 }}>
        <Stack spacing={2}>
          <Button
            variant="contained"
            onClick={handleGenerateInsight}
            disabled={isLoading}
            sx={{ alignSelf: "flex-start", borderRadius: 999 }}
          >
            Generate AI insight
          </Button>

          {isLoading ? (
            <>
              <Skeleton variant="text" height={20} />
              <Skeleton variant="text" height={20} width="95%" />
              <Skeleton variant="text" height={20} width="90%" />
            </>
          ) : error ? (
            <Alert severity="error">{error}</Alert>
          ) : aiSummary ? (
            <Box
              sx={{
                fontSize: "0.95rem",
                lineHeight: 1.7,
                color: "text.primary",
                "& p": { margin: "0 0 12px" },
                "& ul, & ol": { margin: "0 0 12px 20px" },
                "& li": { margin: "4px 0" },
                "& h1, & h2, & h3, & h4": {
                  margin: "16px 0 8px",
                  fontWeight: 700,
                },
                "& code": {
                  backgroundColor: "action.hover",
                  px: 0.75,
                  py: 0.25,
                  borderRadius: 1,
                  fontFamily: "monospace",
                },
                "& pre": {
                  backgroundColor: "action.hover",
                  p: 1.5,
                  borderRadius: 2,
                  overflowX: "auto",
                },
              }}
            >
              <ReactMarkdown>{aiSummary}</ReactMarkdown>
            </Box>
          ) : (
            <Alert severity="info">
              Click “Generate AI insight” to fetch a summary for the current
              metric.
            </Alert>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};
