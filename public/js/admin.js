// public/js/admin.js · usuarios y roles, disciplinas
import { el, fetchJson, api, currentUser, showToast, errorState } from './utils.js';

const ROLES = ['user', 'organizer', 'admin'];
const me = currentUser();
const tbody = document.getElementById('tablaUsuarios');
const total = document.getElementById('totalUsuarios');
const roleFilter = document.getElementById('f-role');
const categoriesList = document.getElementById('listaCategorias');
const categoryForm = document.getElementById('formCategoria');
const categoryError = document.getElementById('catError');

let users = [];

const roleTag = (role) => {
    const className = { admin: 'tag tag-solid', organizer: 'tag', user: 'tag tag-off' }[role] ?? 'tag';
    return el('span', className, role);
};

const fullName = (user) => `${user.first_name} ${user.last_name}`;

const changeRole = async (user, select) => {
    const previous = user.role;
    select.disabled = true;
    try {
        const { payload } = await api('PATCH', `/api/users/${user._id}/role`, { role: select.value });
        user.role = payload.role;
        showToast(`${user.first_name} ahora es ${payload.role}.`);
        renderUsers();
    } catch (error) {
        select.value = previous;
        showToast(error.message, 'error');
    } finally {
        select.disabled = false;
    }
};

const buildRow = (user) => {
    const row = el('tr');
    const name = el('td', null, fullName(user));
    name.style.fontWeight = '500';
    const email = el('td', 'muted', user.email);
    const role = el('td');
    role.append(roleTag(user.role));

    const action = el('td', 't-actions');
    if (user._id === me._id) {
        action.append(el('span', 'muted', 'Sos vos'));   // la API no deja cambiar el propio rol
    } else {
        const select = el('select');
        select.setAttribute('aria-label', `Rol de ${fullName(user)}`);
        ROLES.forEach((value) => {
            const option = el('option', null, value);
            option.value = value;
            option.selected = value === user.role;
            select.append(option);
        });
        select.addEventListener('change', () => changeRole(user, select));
        action.append(select);
    }

    row.append(name, email, role, action);
    return row;
};

const renderUsers = () => {
    const filtered = roleFilter.value ? users.filter((user) => user.role === roleFilter.value) : users;
    total.textContent = `· ${filtered.length}`;
    tbody.replaceChildren();
    if (!filtered.length) {
        const row = el('tr');
        const cell = el('td', 'muted', 'No hay usuarios con ese rol.');
        cell.colSpan = 4;
        row.append(cell);
        tbody.append(row);
        return;
    }
    filtered.forEach((user) => tbody.append(buildRow(user)));
};

const loadUsers = async () => {
    try {
        const { payload } = await fetchJson('/api/users');
        users = payload.sort((a, b) => fullName(a).localeCompare(fullName(b), 'es'));
        renderUsers();
    } catch (error) {
        const row = el('tr');
        const cell = el('td');
        cell.colSpan = 4;
        cell.append(errorState(error.message));
        row.append(cell);
        tbody.replaceChildren(row);
    }
};

const renderCategories = (categories) => {
    categoriesList.replaceChildren();
    if (!categories.length) {
        categoriesList.append(el('li', 'muted', 'Todavía no hay disciplinas.'));
        return;
    }
    categories.forEach((category) => {
        const item = el('li');
        item.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:16px;padding:18px 0;border-bottom:1px solid var(--linea-suave)';
        const name = el('span', 'cond', category.name);
        name.style.fontSize = '19px';
        const limit = category.maxQuantityPerTicket
            ? el('span', 'label-red', `Máx. ${category.maxQuantityPerTicket} por reserva`)
            : el('span', 'muted', 'Sin límite por reserva');
        limit.style.fontSize = '14px';
        item.append(name, limit);
        categoriesList.append(item);
    });
};

const loadCategories = async () => {
    try {
        const { payload } = await fetchJson('/api/categories');
        renderCategories(payload);
    } catch (error) {
        categoriesList.replaceChildren(el('li', 'muted', error.message));
    }
};

categoryForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    categoryError.textContent = '';
    const name = categoryForm.elements.name.value.trim();
    const description = categoryForm.elements.description.value.trim();
    const max = categoryForm.elements.maxQuantityPerTicket.value;

    if (name.length < 3) {
        categoryError.textContent = 'El nombre tiene que tener al menos 3 letras.';
        categoryForm.elements.name.focus();
        return;
    }

    const button = categoryForm.querySelector('button');
    button.disabled = true;
    try {
        await api('POST', '/api/categories', {
            name,
            ...(description && { description }),
            ...(max && { maxQuantityPerTicket: Number(max) })
        });
        showToast(`Disciplina ${name} creada.`);
        categoryForm.reset();
        await loadCategories();
    } catch (error) {
        categoryError.textContent = error.message;
    } finally {
        button.disabled = false;
    }
});

roleFilter.addEventListener('change', renderUsers);

loadUsers();
loadCategories();
