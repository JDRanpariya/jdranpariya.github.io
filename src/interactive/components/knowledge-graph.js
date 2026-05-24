/**
 * D3 force-directed graph — concepts in physical AI.
 * Uses the D3 module's expected API: setup({ container, d3, theme, config, el })
 */
export async function setup({ container, d3, theme, config, el }) {
  const width = container.clientWidth || 700;
  const height = config.height || 500;
  const palette = theme.palette;

  const nodes = [
    { id: "Differentiable Sim", group: 0 },
    { id: "JAX", group: 0 },
    { id: "Cart-Pole", group: 0 },
    { id: "Reinforcement Learning", group: 1 },
    { id: "Policy Gradient", group: 1 },
    { id: "Sim2Real", group: 1 },
    { id: "Actuators", group: 2 },
    { id: "Compliance", group: 2 },
    { id: "Force Control", group: 2 },
    { id: "Foundation Models", group: 3 },
    { id: "Vision-Language", group: 3 },
    { id: "Physical Intelligence", group: 3 },
    { id: "Embodied Cognition", group: 4 },
    { id: "Morphological Comp.", group: 4 },
  ];

  const links = [
    { source: "Differentiable Sim", target: "JAX" },
    { source: "Differentiable Sim", target: "Cart-Pole" },
    { source: "Differentiable Sim", target: "Sim2Real" },
    { source: "Reinforcement Learning", target: "Policy Gradient" },
    { source: "Reinforcement Learning", target: "Sim2Real" },
    { source: "Sim2Real", target: "Actuators" },
    { source: "Actuators", target: "Compliance" },
    { source: "Compliance", target: "Force Control" },
    { source: "Foundation Models", target: "Vision-Language" },
    { source: "Foundation Models", target: "Physical Intelligence" },
    { source: "Physical Intelligence", target: "Embodied Cognition" },
    { source: "Embodied Cognition", target: "Morphological Comp." },
    { source: "Morphological Comp.", target: "Compliance" },
    { source: "Physical Intelligence", target: "Sim2Real" },
    { source: "Cart-Pole", target: "Reinforcement Learning" },
  ];

  const svg = d3
    .select(container)
    .append("svg")
    .attr("width", "100%")
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height]);

  const simulation = d3
    .forceSimulation(nodes)
    .force(
      "link",
      d3
        .forceLink(links)
        .id((d) => d.id)
        .distance(100)
    )
    .force("charge", d3.forceManyBody().strength(-350))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("collision", d3.forceCollide().radius(35));

  const link = svg
    .append("g")
    .selectAll("line")
    .data(links)
    .join("line")
    .attr("stroke", theme.border || "#d4c8b0")
    .attr("stroke-opacity", 0.5)
    .attr("stroke-width", 1.5);

  const node = svg
    .append("g")
    .selectAll("circle")
    .data(nodes)
    .join("circle")
    .attr("r", 9)
    .attr("fill", (d) => palette[d.group % palette.length])
    .attr("stroke", theme.background || "#fff")
    .attr("stroke-width", 2.5)
    .style("cursor", "grab")
    .call(
      d3
        .drag()
        .on("start", (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on("end", (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
    );

  const label = svg
    .append("g")
    .selectAll("text")
    .data(nodes)
    .join("text")
    .text((d) => d.id)
    .attr("font-size", "10px")
    .attr("font-family", "inherit")
    .attr("fill", theme.text || "#1a1410")
    .attr("dx", 14)
    .attr("dy", 4)
    .style("pointer-events", "none");

  simulation.on("tick", () => {
    link
      .attr("x1", (d) => d.source.x)
      .attr("y1", (d) => d.source.y)
      .attr("x2", (d) => d.target.x)
      .attr("y2", (d) => d.target.y);
    node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
    label.attr("x", (d) => d.x).attr("y", (d) => d.y);
  });

  return { simulation, svg };
}
