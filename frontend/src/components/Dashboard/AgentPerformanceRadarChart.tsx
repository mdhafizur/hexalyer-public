import React, { useEffect, useState } from "react";
import { ResponsiveRadar } from "@nivo/radar";
import { Box } from "@mui/material";
import statsData from "../../assests/dummy-data/statsData.json";

const AgentPerformanceRadarChart: React.FC = () => {
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    // Aggregate metrics for each agent
    const agentMetrics: { [agent: string]: { [metric: string]: number } } = {};

    statsData.forEach((task: any) => {
      const { agent, timeTaken, vulnerable } = task;

      if (!agentMetrics[agent]) {
        agentMetrics[agent] = { tasksCompleted: 0, timeTaken: 0, vulnerabilitiesIdentified: 0 };
      }

      agentMetrics[agent].tasksCompleted += 1;

      // Parse timeTaken if available (e.g., "18mins" -> 18)
      const time = parseInt(timeTaken.replace("mins", ""), 10) || 0;
      agentMetrics[agent].timeTaken += time;

      // Count vulnerabilities identified
      agentMetrics[agent].vulnerabilitiesIdentified += vulnerable.length;
    });

    // Transform data for Nivo Radar Chart
    const transformedData = Object.keys(agentMetrics).map((agent) => ({
      agent,
      tasksCompleted: agentMetrics[agent].tasksCompleted,
      timeTaken: agentMetrics[agent].timeTaken,
      vulnerabilitiesIdentified: agentMetrics[agent].vulnerabilitiesIdentified,
    }));

    setChartData(transformedData);
  }, []);

  return (
    <Box
      sx={{
        flexGrow: 1,
        bgcolor: "background.default",
        height: "400px",
        width: "100%",
        minWidth: "400px",
      }}
    >
      <h2 style={{ textAlign: "center" }}>Agent Performance Across Metrics</h2>
      <ResponsiveRadar
        data={chartData}
        keys={["tasksCompleted", "timeTaken", "vulnerabilitiesIdentified"]}
        indexBy="agent"
        maxValue="auto"
        margin={{ right: 80, bottom: 40, left: 80 }}
        curve="linearClosed"
        borderWidth={2}
        borderColor={{ from: "color" }}
        gridLevels={5}
        gridShape="circular"
        gridLabelOffset={36}
        enableDots={true}
        dotSize={12}
        dotColor={{ theme: "background" }}
        dotBorderWidth={3}
        dotBorderColor={{ from: "color", modifiers: [["darker", 0.1]] }}
        colors={{ scheme: "category10" }}
        fillOpacity={0.25}
        blendMode="multiply"
        animate={true}
        isInteractive={true}
        tooltip={({ indexValue, data }) => (
          <div
            style={{
              backgroundColor: "#333",
              color: "#fff",
              padding: "10px",
              borderRadius: "5px",
            }}
          >
            <strong>{indexValue}</strong>
            <ul>
              {Object.keys(data[indexValue]).map((key) =>
                key !== "agent" ? (
                  <li key={key}>
                    {key}: {data[indexValue][key]}
                  </li>
                ) : null
              )}
            </ul>
          </div>
        )}
        theme={{
          dots: {
            text: {
              fill: "#fff", // Text inside dots
            },
          },
          tooltip: {
            container: {
              background: "#222",
              color: "#fff",
              fontSize: "12px",
              borderRadius: "4px",
              boxShadow: "0px 3px 6px rgba(0, 0, 0, 0.15)",
            },
          },
        }}
      />
    </Box>
  );
};

export default AgentPerformanceRadarChart;
