const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export async function classifyTicket(payload) {
  const response = await fetch(`${apiBaseUrl}/v1/classifications`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const body = await parseJsonResponse(response);

  if (!response.ok) {
    throw new Error(body.error?.message ?? "Classification request failed");
  }

  return body;
}

export async function listKnowledgeDocuments() {
  const response = await fetch(`${apiBaseUrl}/v1/knowledge/documents`);
  const body = await parseJsonResponse(response);

  if (!response.ok) {
    throw new Error(body.error?.message ?? "Knowledge documents request failed");
  }

  return body;
}

export async function listKnowledgeChunks(documentId) {
  const url = new URL(`${apiBaseUrl}/v1/knowledge/chunks`);

  if (documentId) {
    url.searchParams.set("documentId", documentId);
  }

  const response = await fetch(url);
  const body = await parseJsonResponse(response);

  if (!response.ok) {
    throw new Error(body.error?.message ?? "Knowledge chunks request failed");
  }

  return body;
}

export async function searchKnowledge(payload) {
  const response = await fetch(`${apiBaseUrl}/v1/knowledge/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  const body = await parseJsonResponse(response);

  if (!response.ok) {
    throw new Error(body.error?.message ?? "Knowledge search request failed");
  }

  return body;
}

async function parseJsonResponse(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}
