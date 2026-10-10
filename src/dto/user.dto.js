export const toCurrentUserDTO = (user) => ({
    _id: user._id,
    email: user.email,
    role: user.role
});

// POST /api/sessions/login
export const toLoginUserDTO = (user) => ({
    _id: user._id,
    name: user.first_name,
    email: user.email,
    role: user.role
});

// POST /api/sessions/register
export const toRegisteredUserDTO = (user) => ({
    name: user.first_name,
    email: user.email,
    role: user.role
});

// GET /api/users y PATCH /api/users/:uid/role
export const toUserDTO = (user) => ({
    _id: user._id,
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
});