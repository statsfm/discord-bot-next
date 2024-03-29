import Api, { Album, Artist, Track } from '@statsfm/statsfm.js';
import { container } from 'tsyringe';
import { SearchCommand } from '../../interactions/commands/search';
import { createCommand } from '../../util/Command';
import { createEmbed } from '../../util/embed';
import { searchAlbumsSubCommand } from './sub/albums';
import { searchArtistsSubCommand } from './sub/artists';
import { searchTracksSubCommand } from './sub/tracks';
import { URL } from 'node:url';

interface AlbumsSearchResult {
  items: {
    albums: Album[];
  };
}

interface ArtistsSearchResult {
  items: {
    artists: Artist[];
  };
}

interface TracksSearchResult {
  items: {
    tracks: Track[];
  };
}

function toFullUrl(url: string) {
  if (url.startsWith('http')) return url;
  return `https://${url}`;
}

const api = container.resolve(Api);

export default createCommand(SearchCommand)
  .registerSubCommand('albums', searchAlbumsSubCommand)
  .registerSubCommand('artists', searchArtistsSubCommand)
  .registerSubCommand('tracks', searchTracksSubCommand)
  .registerAutocomplete(async ({ interaction, args }) => {
    if (args.artists) {
      const artist = args.artists.query;
      if (artist.length === 0) return interaction.respond([]);

      if (/(https?:\/\/)?stats\.fm\/artist\/\d+/.test(artist)) {
        const url = new URL(toFullUrl(artist));
        const artistId = Number(url.pathname.split('/').pop());

        if (!artistId) return interaction.respond([]);

        try {
          const artistData = await api.artists.get(artistId);
          return interaction.respond([
            {
              name: `${
                artistData.name
              } - ${artistData.followers.toLocaleString()} followers`,
              value: `${artistData.id}`,
            },
          ]);
        } catch (e) {
          return interaction.respond([]);
        }
      } else if (
        /(https?:\/\/)?open\.spotify\.com\/artist\/[0-9a-zA-Z]+/.test(artist)
      ) {
        const url = new URL(toFullUrl(artist));
        const spotifyArtistId = url.pathname.split('/').pop();

        if (!spotifyArtistId) return interaction.respond([]);

        try {
          const artistData = await api.artists.getSpotify(spotifyArtistId);
          return interaction.respond([
            {
              name: `${
                artistData.name
              } - ${artistData.followers.toLocaleString()} followers`,
              value: `${artistData.id}`,
            },
          ]);
        } catch (e) {
          return interaction.respond([]);
        }
      } else {
        const artistsRequest = await api.http.get<ArtistsSearchResult>(
          '/search/elastic',
          {
            query: {
              query: artist,
              limit: 20,
              type: 'artist',
            },
          }
        );

        return interaction.respond(
          artistsRequest.items.artists.map((artist) => ({
            name: `${
              artist.name
            } - ${artist.followers.toLocaleString()} followers`,
            value: `${artist.id}`,
          }))
        );
      }
    }
    if (args.albums) {
      const album = args.albums.query;
      if (album.length === 0) return interaction.respond([]);

      if (/(https?:\/\/)?stats\.fm\/album\/\d+/.test(album)) {
        const url = new URL(toFullUrl(album));
        const albumId = Number(url.pathname.split('/').pop());

        if (!albumId) return interaction.respond([]);

        try {
          const albumData = await api.albums.get(albumId);
          return interaction.respond([
            {
              name: `${albumData.name} by ${albumData.artists
                .splice(0, 2)
                .map((artist) => artist.name)
                .join(', ')}`,
              value: `${albumData.id}`,
            },
          ]);
        } catch (e) {
          return interaction.respond([]);
        }
      } else if (
        /(https?:\/\/)?open\.spotify\.com\/album\/[0-9a-zA-Z]+/.test(album)
      ) {
        const url = new URL(toFullUrl(album));
        const spotifyAlbumId = url.pathname.split('/').pop();

        if (!spotifyAlbumId) return interaction.respond([]);

        try {
          const albumData = await api.albums.getSpotify(spotifyAlbumId);
          return interaction.respond([
            {
              name: `${albumData.name} by ${albumData.artists
                .splice(0, 2)
                .map((artist) => artist.name)
                .join(', ')}`,
              value: `${albumData.id}`,
            },
          ]);
        } catch (e) {
          return interaction.respond([]);
        }
      } else {
        const albumsRequest = await api.http.get<AlbumsSearchResult>(
          '/search/elastic',
          {
            query: {
              query: album,
              limit: 20,
              type: 'album',
            },
          }
        );

        return interaction.respond(
          albumsRequest.items.albums.map((album) => ({
            name: `${album.name} by ${album.artists
              .splice(0, 2)
              .map((artist) => artist.name)
              .join(', ')}`,
            value: `${album.id}`,
          }))
        );
      }
    }
    if (args.tracks) {
      const track = args.tracks.query;
      if (track.length === 0) return interaction.respond([]);

      if (/(https?:\/\/)?stats\.fm\/track\/\d+/.test(track)) {
        const url = new URL(toFullUrl(track));
        const trackId = Number(url.pathname.split('/').pop());

        if (!trackId) return interaction.respond([]);

        try {
          const trackData = await api.tracks.get(trackId);
          return interaction.respond([
            {
              name: `${trackData.name} by ${trackData.artists
                .splice(0, 2)
                .map((artist) => artist.name)
                .join(', ')}`,
              value: `${trackData.id}`,
            },
          ]);
        } catch (e) {
          return interaction.respond([]);
        }
      } else if (
        /(https?:\/\/)?open\.spotify\.com\/track\/[0-9a-zA-Z]+/.test(track)
      ) {
        const url = new URL(toFullUrl(track));
        const spotifyTrackId = url.pathname.split('/').pop();

        if (!spotifyTrackId) return interaction.respond([]);

        try {
          const trackData = await api.tracks.getSpotify(spotifyTrackId);
          return interaction.respond([
            {
              name: `${trackData.name} by ${trackData.artists
                .splice(0, 2)
                .map((artist) => artist.name)
                .join(', ')}`,
              value: `${trackData.id}`,
            },
          ]);
        } catch (e) {
          return interaction.respond([]);
        }
      } else {
        const tracksRequest = await api.http.get<TracksSearchResult>(
          '/search/elastic',
          {
            query: {
              query: track,
              limit: 20,
              type: 'track',
            },
          }
        );

        return interaction.respond(
          tracksRequest.items.tracks.map((track) => ({
            name: `${track.name} by ${track.artists
              .splice(0, 2)
              .map((artist) => artist.name)
              .join(', ')}`,
            value: `${track.id}`,
          }))
        );
      }
    }
  })
  .registerChatInput(
    async ({ interaction, args, statsfmUser, respond, subCommands }) => {
      switch (Object.keys(args)[0]) {
        case 'artists':
          return subCommands.artists({
            interaction,
            args: args.artists,
            statsfmUser,
            respond,
          });
        case 'tracks':
          return subCommands.tracks({
            interaction,
            args: args.tracks,
            statsfmUser,
            respond,
          });
        case 'albums':
          return subCommands.albums({
            interaction,
            args: args.albums,
            statsfmUser,
            respond,
          });
        default:
          return respond(interaction, {
            embeds: [
              createEmbed()
                .setTitle(`Unknown top command ${Object.keys(args)[0]}`)
                .toJSON(),
            ],
          });
      }
    }
  )
  .build();
