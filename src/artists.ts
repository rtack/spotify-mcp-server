import type { MaxInt } from '@spotify/web-api-ts-sdk';
import { z } from 'zod';
import { defineTool } from './tool.js';
import type { SpotifyHandlerExtra } from './types.js';
import { handleSpotifyRequest } from './utils.js';

// Spotify deprecated follow-artists-users (and its /contains check) in
// favor of Save Items to Library, which doesn't support artists at all
// (track/album/episode/show/audiobook/user/playlist only) — see
// developer.spotify.com/documentation/web-api/reference/follow-artists-users.
// No Spotify Web API endpoint currently follows an artist, so only the
// read side is exposed here.

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
          limit as MaxInt<50>,
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

export const artistTools = [getFollowedArtists];
