function pageRequest(query = {}, { defaultLimit = 24, maxLimit = 100 } = {}) {
  const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || defaultLimit, 1), maxLimit);
  return { page, limit, skip: (page - 1) * limit };
}

function pageMetadata({ page, limit }, total) {
  return {
    page,
    limit,
    total,
    pages: Math.max(Math.ceil(total / limit), 1),
    hasMore: page * limit < total,
  };
}

module.exports = { pageMetadata, pageRequest };
