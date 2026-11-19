async function responseData(response) {
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error || `Request failed (${response.status}).`);
  return data;
}

export async function send(url, input, method = "POST") {
  const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
  return responseData(response);
}

export async function uploadFile(file, kind) {
  const url = `/api/studio/upload?${new URLSearchParams({ kind, name: file.name })}`;
  const response = await fetch(url, { method: "POST", body: file });
  return responseData(response);
}
