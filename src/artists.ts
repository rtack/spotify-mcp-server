import { z } from 'zod';
import { defineTool } from './tool.js';
import type { SpotifyHandlerExtra } from './types.js';
import { handleSpotifyRequest } from './utils.js';

// NOTE: Spotify deprecated the follow/unfollow-artist and
// follow-contains-check endpoints ("Use Save Items to Library instead" —
// developer.spotify.com/documentation/web-api/reference/follow-artists-users).
// Live-verified 2026-09-08: both now return 403 ("wrong consumer key" — the
// generic error Spotify's gateway gives for a retired endpoint; the message
// explicitly notes re-authenticating won't help). Worse, the replacement
// "Save Items to Library" endpoint's supported types (track/album/episode/
// show/audiobook/user/playlist) don't include artist at all — there is
// currently no Spotify Web API endpoint that can follow an artist, for any
// app. Only the read side (getFollowedArtists below) still works. Do not
// re-add a follow/unfollow-artist tool unless Spotify ships a replacement.

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

export const artistTools = [getFollowedArtists];
