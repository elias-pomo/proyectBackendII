export const isPopulated = (value) =>
    value !== null && typeof value === 'object' && value._bsontype === undefined;