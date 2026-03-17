import { errorHandling, telemetryData } from "./utils/middleware";

export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const clonedRequest = request.clone();
        const formData = await clonedRequest.formData();

        await errorHandling(context);
        telemetryData(context);

        const uploadFile = formData.get('file');
        if (!uploadFile) {
            throw new Error('No file uploaded');
        }

        const fileName = uploadFile.name;
        const fileExtension = fileName.split('.').pop().toLowerCase();
        const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExtension}`;

        // 读取文件内容
        const fileContent = await uploadFile.arrayBuffer();

        // 上传到 R2 存储桶
        if (!env.MY_BUCKET) {
            throw new Error('R2 bucket not configured');
        }

        await env.MY_BUCKET.put(uniqueFileName, fileContent, {
            httpMetadata: {
                contentType: uploadFile.type
            }
        });

        // 构建文件 URL
        const fileUrl = `https://${env.CF_PAGES_DOMAIN}/r2/${uniqueFileName}`;

        // 将文件信息保存到 KV 存储
        if (env.img_url) {
            await env.img_url.put(uniqueFileName, "", {
                metadata: {
                    TimeStamp: Date.now(),
                    ListType: "None",
                    Label: "None",
                    liked: false,
                    fileName: fileName,
                    fileSize: uploadFile.size,
                }
            });
        }

        return new Response(
            JSON.stringify([{ 'src': fileUrl }]),
            {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    } catch (error) {
        console.error('Upload error:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}
