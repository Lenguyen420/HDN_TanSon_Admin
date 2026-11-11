import { ensureStoredAdminToken } from "@/services/auth.service";

export type KnowledgeStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type KnowledgeItem = {
  id: string;
  title: string;
  category: string;
  keywords: string[];
  content: string;
  sourceLabel: string;
  sourceUrl: string | null;
  status: KnowledgeStatus;
  createdAt: string;
  updatedAt: string;
};

export type CreateKnowledgePayload = {
  title: string;
  category: string;
  keywords: string[];
  content: string;
  sourceLabel: string;
  sourceUrl?: string | null;
};

export type UpdateKnowledgePayload = Partial<CreateKnowledgePayload>;

export type UnansweredQuestionStatus = "OPEN" | "RESOLVED" | "IGNORED";

export type ChatbotUnansweredQuestion = {
  id: string;
  question: string;
  normalizedQuestion: string;
  questionHash: string;
  askCount: number;
  firstAskedAt: string;
  lastAskedAt: string;
  status: UnansweredQuestionStatus;
  resolvedByDocumentId: string | null;
  note: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};
export type UnansweredQuestionsQuery = {
  page?: number;
  limit?: number;
  keyword?: string;
  status?: UnansweredQuestionStatus;
};

export type UnansweredQuestionsPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type UnansweredQuestionsResult = {
  items: ChatbotUnansweredQuestion[];
  pagination: UnansweredQuestionsPagination;
};
type UnansweredQuestionsApiResponse =
  | ChatbotUnansweredQuestion[]
  | {
    data?: ChatbotUnansweredQuestion[];
    items?: ChatbotUnansweredQuestion[];
    questions?: ChatbotUnansweredQuestion[];
    unansweredQuestions?: ChatbotUnansweredQuestion[];
    pagination?: Partial<UnansweredQuestionsPagination>;
  };

const API_URL = "https://externally-tight-serval.ngrok-free.app";

const UNANSWERED_QUESTIONS_PATH =
  process.env.NEXT_PUBLIC_UNANSWERED_QUESTIONS_PATH ??
  "/chat/unanswered-questions";

async function getHeaders(
  hasJsonBody = false,
): Promise<HeadersInit> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "ngrok-skip-browser-warning": "true",
  };

  const token = await ensureStoredAdminToken();

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  if (hasJsonBody) {
    headers["Content-Type"] =
      "application/json";
  }

  return headers;
}

async function handleResponse<T>(
  response: Response,
): Promise<T> {
  if (!response.ok) {
    const errorBody =
      await response.text();

    throw new Error(
      errorBody ||
      `API request failed: ${response.status}`,
    );
  }

  if (
    response.status === 204 ||
    response.headers.get(
      "content-length",
    ) === "0"
  ) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

function normalizeUnansweredQuestionsResponse(
  response: UnansweredQuestionsApiResponse,
  query: UnansweredQuestionsQuery,
): UnansweredQuestionsResult {
  const defaultPage = query.page ?? 1;
  const defaultLimit = query.limit ?? 20;

  if (Array.isArray(response)) {
    return {
      items: response,
      pagination: {
        page: defaultPage,
        limit: defaultLimit,
        total: response.length,
        totalPages:
          response.length === 0
            ? 0
            : Math.ceil(response.length / defaultLimit),
      },
    };
  }

  const items =
    response.data ??
    response.items ??
    response.questions ??
    response.unansweredQuestions ??
    [];

  return {
    items,
    pagination: {
      page: response.pagination?.page ?? defaultPage,
      limit: response.pagination?.limit ?? defaultLimit,
      total: response.pagination?.total ?? items.length,
      totalPages:
        response.pagination?.totalPages ??
        (items.length === 0
          ? 0
          : Math.ceil(items.length / defaultLimit)),
    },
  };
}

export async function getKnowledgeItems(): Promise<
  KnowledgeItem[]
> {
  const response = await fetch(
    `${API_URL}/admin/knowledge`,
    {
      method: "GET",
      headers: await getHeaders(),
      cache: "no-store",
    },
  );

  return handleResponse<KnowledgeItem[]>(
    response,
  );
}

export async function getKnowledgeById(
  id: string,
): Promise<KnowledgeItem> {
  const response = await fetch(
    `${API_URL}/admin/knowledge/${id}`,
    {
      method: "GET",
      headers: await getHeaders(),
      cache: "no-store",
    },
  );

  return handleResponse<KnowledgeItem>(
    response,
  );
}

export async function createKnowledge(
  payload: CreateKnowledgePayload,
): Promise<KnowledgeItem> {
  const response = await fetch(
    `${API_URL}/admin/knowledge`,
    {
      method: "POST",
      headers: await getHeaders(true),
      body: JSON.stringify(payload),
    },
  );

  return handleResponse<KnowledgeItem>(
    response,
  );
}

export async function updateKnowledge(
  id: string,
  payload: UpdateKnowledgePayload,
): Promise<KnowledgeItem> {
  const response = await fetch(
    `${API_URL}/admin/knowledge/${id}`,
    {
      method: "PATCH",
      headers: await getHeaders(true),
      body: JSON.stringify(payload),
    },
  );

  return handleResponse<KnowledgeItem>(
    response,
  );
}

export async function publishKnowledge(
  id: string,
): Promise<KnowledgeItem> {
  const response = await fetch(
    `${API_URL}/admin/knowledge/${id}/publish`,
    {
      method: "POST",
      headers: await getHeaders(),
    },
  );

  return handleResponse<KnowledgeItem>(
    response,
  );
}

export async function archiveKnowledge(
  id: string,
): Promise<KnowledgeItem> {
  const response = await fetch(
    `${API_URL}/admin/knowledge/${id}/archive`,
    {
      method: "POST",
      headers: await getHeaders(),
    },
  );

  return handleResponse<KnowledgeItem>(
    response,
  );
}

export async function getUnansweredQuestions(
  query: UnansweredQuestionsQuery = {},
): Promise<UnansweredQuestionsResult> {
  const searchParams = new URLSearchParams();

  if (query.page) {
    searchParams.set("page", String(query.page));
  }

  if (query.limit) {
    searchParams.set("limit", String(query.limit));
  }

  if (query.keyword?.trim()) {
    searchParams.set("keyword", query.keyword.trim());
  }

  if (query.status) {
    searchParams.set("status", query.status);
  }

  const queryString = searchParams.toString();

  const response = await fetch(
    `${API_URL}${UNANSWERED_QUESTIONS_PATH}${queryString ? `?${queryString}` : ""
    }`,
    {
      method: "GET",
      headers: await getHeaders(),
      cache: "no-store",
    },
  );

  const data =
    await handleResponse<UnansweredQuestionsApiResponse>(
      response,
    );

  return normalizeUnansweredQuestionsResponse(
    data,
    query,
  );
}
