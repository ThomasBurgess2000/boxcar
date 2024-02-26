export async function loadShader(url: string): Promise<string> {
  const response = await fetch(url);
  return response.text();
}
