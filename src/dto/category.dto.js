export const toCategoryDTO = (category) => ({
    _id: category._id,
    name: category.name,
    description: category.description,
    color: category.color,
    maxQuantityPerTicket: category.maxQuantityPerTicket,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt
});