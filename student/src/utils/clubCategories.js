const PREFERRED_CLUB_CATEGORY_ORDER = [
  "cultural",
  "technical",
  "departmental",
  "others",
];

export function sortClubCategories(categories) {
  const preferredIndex = new Map(
    PREFERRED_CLUB_CATEGORY_ORDER.map((category, index) => [category, index]),
  );

  return [...new Set([...PREFERRED_CLUB_CATEGORY_ORDER, ...categories.filter(Boolean)])].sort((left, right) => {
    const leftIndex = preferredIndex.get(left) ?? Number.POSITIVE_INFINITY;
    const rightIndex = preferredIndex.get(right) ?? Number.POSITIVE_INFINITY;

    return leftIndex - rightIndex || left.localeCompare(right);
  });
}
