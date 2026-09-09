export default async function handler(request, response) {
  const requestedLimit = Math.max(10, Math.min(601, Number(request.query?.limit) || 601));
  const pageSize = 100;
  const rows = [];

  try {
    for (let offset = 0; offset < requestedLimit; offset += pageSize) {
      const length = Math.min(pageSize, requestedLimit - offset);
      const url = `https://datasets-server.huggingface.co/rows?dataset=RepDB%2Fexercise-dataset&config=default&split=train&offset=${offset}&length=${length}`;
      const upstream = await fetch(url, { headers: { Accept: "application/json" } });

      if (!upstream.ok) {
        throw new Error(`RepDB respondió ${upstream.status}`);
      }

      const data = await upstream.json();
      const pageRows = Array.isArray(data.rows) ? data.rows : [];
      rows.push(...pageRows);

      if (pageRows.length < length) {
        break;
      }
    }

    response.setHeader("Cache-Control", "s-maxage=21600, stale-while-revalidate=86400");
    response.status(200).json({ rows: rows.slice(0, requestedLimit) });
  } catch (error) {
    response.status(500).json({ error: error instanceof Error ? error.message : "No fue posible consultar RepDB." });
  }
}
