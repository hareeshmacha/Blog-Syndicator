import jwt from 'jsonwebtoken';
import { marked } from 'marked';

export interface PublishResult {
    platform: string;
    success: boolean;
    url?: string;
    error?: string;
}

export const publishToDevTo = async (
    title: string,
    content: string,
    apiKey: string,
    canonicalUrl?: string
): Promise<PublishResult> => {
    try {
        const response = await fetch('https://dev.to/api/articles', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': apiKey,
            },
            body: JSON.stringify({
                article: {
                    title,
                    body_markdown: content,
                    published: true,
                    canonical_url: canonicalUrl
                }
            })
        });

        if (!response.ok) {
            const err = await response.text();
            return { platform: 'Dev.to', success: false, error: err };
        }

        const data = await response.json();
        return { platform: 'Dev.to', success: true, url: data.url };
    } catch (error: any) {
        return { platform: 'Dev.to', success: false, error: error.message };
    }
};

export const publishToHashnode = async (
    title: string,
    content: string,
    apiKey: string,
    canonicalUrl?: string
): Promise<PublishResult> => {
    try {
        const userRes = await fetch('https://gql.hashnode.com/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': apiKey
            },
            body: JSON.stringify({
                query: `
          query {
            me {
              id
              publications(first: 1) {
                edges {
                  node {
                    id
                  }
                }
              }
            }
          }
        `
            })
        });

        const userData: any = await userRes.json();
        const publicationId = userData?.data?.me?.publications?.edges?.[0]?.node?.id;

        if (!publicationId) {
            return { platform: 'Hashnode', success: false, error: 'No publication found for this Hashnode account.' };
        }

        const publishRes = await fetch('https://gql.hashnode.com/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': apiKey
            },
            body: JSON.stringify({
                query: `
          mutation PublishPost($input: PublishPostInput!) {
            publishPost(input: $input) {
              post {
                url
              }
            }
          }
        `,
                variables: {
                    input: {
                        title,
                        contentMarkdown: content,
                        publicationId,
                        tags: [],
                        originalArticleURL: canonicalUrl
                    }
                }
            })
        });

        const publishData: any = await publishRes.json();
        if (publishData.errors) {
            return { platform: 'Hashnode', success: false, error: publishData.errors[0].message };
        }

        return { platform: 'Hashnode', success: true, url: publishData.data.publishPost.post.url };
    } catch (error: any) {
        return { platform: 'Hashnode', success: false, error: error.message };
    }
};

export const publishToBlogger = async (
    title: string,
    content: string,
    blogId: string,
    accessToken: string,
    canonicalUrl?: string
): Promise<PublishResult> => {
    try {
        let htmlContent = await marked.parse(content);

        if (canonicalUrl) {
            htmlContent += `\n<br><br><p><i>Originally published at <a href="${canonicalUrl}">${canonicalUrl}</a></i></p>`;
        }

        const response = await fetch(`https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                kind: 'blogger#post',
                blog: { id: blogId },
                title,
                content: htmlContent
            })
        });

        if (!response.ok) {
            const err = await response.text();
            return { platform: 'Blogger', success: false, error: err };
        }

        const data = await response.json();
        return { platform: 'Blogger', success: true, url: data.url };
    } catch (error: any) {
        return { platform: 'Blogger', success: false, error: error.message };
    }
};
