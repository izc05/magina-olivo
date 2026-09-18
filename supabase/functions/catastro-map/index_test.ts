Deno.test("Catastro WFS uses the official HTTP endpoint", async () => {
  const source = await Deno.readTextFile(new URL("./index.ts", import.meta.url));
  const expected =
    'const CATASTRO_WFS_URL = "http://ovc.catastro.meh.es/INSPIRE/wfsCP.aspx";';

  if (!source.includes(expected)) {
    throw new Error(
      "catastro-map must use the official HTTP WFS endpoint to avoid TLS resets",
    );
  }
});
