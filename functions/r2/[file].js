export async function onRequestGet(context) {
    const { params, env } = context;
    const { file } = params;

    try {
        if (!env.MY_BUCKET) {
            return new Response('R2 bucket not configured', { status: 500 });
        }

        const object = await env.MY_BUCKET.get(file);
        if (!object) {
            return new Response('File not found', { status: 404 });
        }

        const headers = new Headers();
        object.writeHttpMetadata(headers);
        headers.set('etag', object.httpEtag);

        return new Response(object.body, { headers });
    } catch (error) {
        console.error('R2 access error:', error);
        return new Response('Internal server error', { status: 500 });
    }
}
