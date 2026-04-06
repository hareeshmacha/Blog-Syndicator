import jwt from 'jsonwebtoken';

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
                    published: false,
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

export const publishToGhost = async (
    title: string,
    content: string,
    apiUrl: string,
    adminApiKey: string,
    canonicalUrl?: string
): Promise<PublishResult> => {
    try {
        const [id, secret] = adminApiKey.split(':');
        if (!id || !secret) throw new Error('Invalid Ghost Admin API Key format');

        const token = jwt.sign({}, Buffer.from(secret, 'hex'), {
            keyid: id,
            algorithm: 'HS256',
            expiresIn: '5m',
            audience: `/admin/`
        });

        const mobiledoc = JSON.stringify({
            version: '0.3.1',
            markups: [],
            atoms: [],
            cards: [['markdown', { markdown: content }]],
            sections: [[10, 0]]
        });

        const body: any = {
            posts: [{
                title,
                mobiledoc,
                status: 'draft',
            }]
        };
        if (canonicalUrl) {
            body.posts[0].canonical_url = canonicalUrl;
        }

        const ghostEndpoint = apiUrl.replace(/\/$/, '') + '/ghost/api/admin/posts/';
        const response = await fetch(ghostEndpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Ghost ${token}`,
                'Content-Type': 'application/json',
                'Accept-Version': 'v5.0'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const err = await response.text();
            return { platform: 'Ghost', success: false, error: err };
        }

        const data = await response.json();
        return { platform: 'Ghost', success: true, url: data.posts[0].url };
    } catch (error: any) {
        return { platform: 'Ghost', success: false, error: error.message };
    }
};
