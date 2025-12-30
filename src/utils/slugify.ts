export const slugify = (text: string): string => {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
};

export const generateUniqueSlug = (title: string, id: string): string => {
    const baseSlug = slugify(title);
    const shortId = id.substring(0, 8);
    return `${baseSlug}-${shortId}`;
};
