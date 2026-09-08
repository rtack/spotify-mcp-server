import { z } from 'zod';
import { defineTool } from './tool.js';
import type { SpotifyHandlerExtra } from './types.js';
import { handleSpotifyRequest } from './utils.js';

const followOrUnfollowArtists = defineTool({
  name: 'followOrUnfollowArtists',
  description: "Follow or unfollow artists on the user's Spotify account",
  schema: {
    artistIds: z
      .array(z.string())
      .max(50)
      .describe('Array of Spotify artist IDs (max 50)'),
    action: z
      .enum(['follow', 'unfollow'])
      .describe('Action to perform: follow or unfollow'),
  },
  handler: async (args, _extra: SpotifyHandlerExtra) => {
    const { artistIds, action } = args;

    if (artistIds.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: 'Error: No artist IDs provided',
          },
        ],
      };
    }

    try {
      await handleSpotifyRequest(async (spotifyApi) => {
        return action === 'follow'
          ? await spotifyApi.currentUser.followArtistsOrUsers(
              artistIds,
              'artist',
            )
          : await spotifyApi.currentUser.unfollowArtistsOrUsers(
              artistIds,
              'artist',
            );
      });

      const actionPastTense = action === 'follow' ? 'followed' : 'unfollowed';

      return {
        content: [
          {
            type: 'text',
            text: `Successfully ${actionPastTense} ${artistIds.length} artist${artistIds.length === 1 ? '' : 's'}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error ${action === 'follow' ? 'following' : 'unfollowing'} artists: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
      };
    }
  },
});

const checkFollowedArtists = defineTool({
  name: 'checkFollowedArtists',
  description: "Check whether artists are followed on the user's account",
  schema: {
    artistIds: z
      .array(z.string())
      .max(50)
      .describe('Array of Spotify artist IDs to check (max 50)'),
  },
  handler: async (args, _extra: SpotifyHandlerExtra) => {
    const { artistIds } = args;

    if (artistIds.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: 'Error: No artist IDs provided',
          },
        ],
      };
    }

    try {
      const followedStatus = await handleSpotifyRequest(async (spotifyApi) => {
        return await spotifyApi.currentUser.followsArtistsOrUsers(
          artistIds,
          'artist',
        );
      });

      const formattedResults = artistIds
        .map((artistId, i) => {
          const isFollowed = followedStatus[i];
          return `${i + 1}. ${artistId}: ${isFollowed ? 'Followed' : 'Not followed'}`;
        })
        .join('\n');

      return {
        content: [
          {
            type: 'text',
            text: `# Artist Follow Status\n\n${formattedResults}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error checking followed artists: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
      };
    }
  },
});

const getFollowedArtists = defineTool({
  name: 'getFollowedArtists',
  description: "Get the current user's followed artists (paginated)",
  schema: {
    after: z
      .string()
      .optional()
      .describe('The last artist ID from the previous page, for pagination'),
    limit: z
      .number()
      .min(1)
      .max(50)
      .optional()
      .describe('Maximum number of artists to return (1-50)'),
  },
  handler: async (args, _extra: SpotifyHandlerExtra) => {
    const { after, limit = 20 } = args;

    try {
      const result = await handleSpotifyRequest(async (spotifyApi) => {
        return await spotifyApi.currentUser.followedArtists(
          after,
          limit as import('@spotify/web-api-ts-sdk').MaxInt<50>,
        );
      });

      const artists = result.artists.items;

      if (artists.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: 'No followed artists found',
            },
          ],
        };
      }

      const formattedArtists = artists
        .map((artist, i) => `${i + 1}. "${artist.name}" - ID: ${artist.id}`)
        .join('\n');

      const hasMore = result.artists.next !== null;
      const lastArtistId = artists[artists.length - 1]?.id;

      return {
        content: [
          {
            type: 'text',
            text: `# Followed Artists (${artists.length} of ${result.artists.total})\n\n${formattedArtists}${
              hasMore && lastArtistId
                ? `\n\nNext page: pass after="${lastArtistId}"`
                : ''
            }`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error getting followed artists: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
      };
    }
  },
});

export const artistTools = [
  followOrUnfollowArtists,
  checkFollowedArtists,
  getFollowedArtists,
];
