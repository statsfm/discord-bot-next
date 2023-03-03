import {
  Api,
  CurrentlyPlayingTrack,
  Range,
  StreamStats,
} from '@statsfm/statsfm.js';
import { MessageFlags } from 'discord.js';
import { container } from 'tsyringe';
import { CurrentlyPlayingMinimalCommand } from '../interactions/commands/currentlyPlayingMinimal';
import { createCommand } from '../util/Command';
import {
  createEmbed,
  invalidClientEmbed,
  notLinkedEmbed,
  privacyEmbed,
  unexpectedErrorEmbed,
} from '../util/embed';
import { getStatsfmUserFromDiscordUser } from '../util/getStatsfmUserFromDiscordUser';
import { reportError } from '../util/Sentry';
import { URLs } from '../util/URLs';
import { murmur3 } from 'murmurhash-js';
import { getDuration } from '../util/getDuration';
import { PrivacyManager } from '../util/PrivacyManager';

const statsfmApi = container.resolve(Api);
const privacyManager = container.resolve(PrivacyManager);

export default createCommand(CurrentlyPlayingMinimalCommand)
  .addGuild('763775648819970068')
  .addGuild('901602034443227166')
  .registerChatInput(async (interaction, args, statsfmUserSelf, respond) => {
    await interaction.deferReply();
    const showStats = args['show-stats'] ?? false;

    const targetUser = args.user?.user ?? interaction.user;
    const statsfmUser =
      targetUser === interaction.user
        ? statsfmUserSelf
        : await getStatsfmUserFromDiscordUser(targetUser);

    if (!statsfmUser)
      return respond(interaction, {
        embeds: [notLinkedEmbed(targetUser)],
      });

    let currentlyPlaying: CurrentlyPlayingTrack | undefined;

    if (statsfmUser.privacySettings.currentlyPlaying) {
      try {
        currentlyPlaying = await statsfmApi.users.currentlyStreaming(
          statsfmUser.id
        );
      } catch (err) {
        const error = err as any;
        if (
          error.data &&
          error.data.message &&
          error.data.message == 'Nothing playing'
        ) {
          currentlyPlaying = undefined;
        } else if (
          error.data &&
          error.data.message &&
          error.data.message.includes('invalid_client')
        ) {
          return respond(interaction, {
            embeds: [invalidClientEmbed()],
          });
        } else {
          const errorId = reportError(err, interaction);

          return respond(interaction, {
            embeds: [unexpectedErrorEmbed(errorId)],
          });
        }
      }
    }

    if (!currentlyPlaying) {
      return respond(interaction, {
        content: `**${targetUser.tag}** is currently not listening to anything.`,
      });
    }

    const statsEmbedGroup: [number, number] = [0, 0];
    const noStatsEmbedGroup: [number, number] = [0, 0];
    const experimentHash =
      murmur3(
        `03-2023-now_playing_minimal|${targetUser.id}|${showStats ? '1' : '0'}`
      ) % 1e3;

    let stats: StreamStats | undefined;
    if (statsfmUser.privacySettings.streamStats && showStats) {
      try {
        stats = await statsfmApi.users.trackStats(
          statsfmUser.id,
          currentlyPlaying.track.id,
          {
            range: Range.LIFETIME,
          }
        );
      } catch (err) {
        const errorId = reportError(err, interaction);
        return respond(interaction, {
          embeds: [unexpectedErrorEmbed(errorId)],
        });
      }
    } else if (!statsfmUser.privacySettings.streamStats && showStats) {
      return respond(interaction, {
        embeds: [
          privacyEmbed(
            targetUser,
            privacyManager.getPrivacySettingsMessage(
              'currentlyPlayingMinimal',
              'streamStats'
            )
          ),
        ],
      });
    }

    const songByArtist = `**[${currentlyPlaying.track.name}](${URLs.TrackUrl(
      currentlyPlaying.track.id
    )})** by ${currentlyPlaying.track.artists
      .map((artist) => `**[${artist.name}](${URLs.ArtistUrl(artist.id)})**`)
      .join(', ')}`;

    const defaultTextMessage = `**${targetUser.tag}** is currently listening to ${songByArtist}.`;

    const embed = createEmbed()
      .setAuthor({
        name: `${targetUser.tag} is currently listening to`,
        iconURL: targetUser.displayAvatarURL(),
      })
      .setDescription(songByArtist)
      .setTimestamp()
      .setThumbnail(currentlyPlaying.track.albums[0].image);

    if (
      isInExperimentGroup(experimentHash, [statsEmbedGroup]) &&
      showStats &&
      stats
    ) {
      embed.setFooter({
        text: `Lifetime streams: ${stats.count ?? 0} • Total time streamed: ${
          stats.durationMs > 0
            ? getDuration(stats.durationMs, true)
            : '0 minutes'
        }`,
      });

      return respond(interaction, {
        embeds: [embed],
      });
    } else if (
      !isInExperimentGroup(experimentHash, [statsEmbedGroup]) &&
      showStats &&
      stats
    ) {
      return respond(interaction, {
        content: `${defaultTextMessage} **${
          stats.count ?? 0
        }** lifetime streams and ${
          stats.durationMs > 0 ? getDuration(stats.durationMs) : '**0** minutes'
        } total time streamed.`,
        flags: MessageFlags.SuppressEmbeds,
      });
    }

    if (isInExperimentGroup(experimentHash, [noStatsEmbedGroup])) {
      return respond(interaction, {
        embeds: [embed],
      });
    } else {
      return respond(interaction, {
        content: defaultTextMessage,
        flags: MessageFlags.SuppressEmbeds,
      });
    }
  })
  .build();

function isInExperimentGroup(
  experimentHash: number,
  groups: [number, number][]
) {
  return groups.some(
    (group) => experimentHash >= group[0] && experimentHash < group[1]
  );
}
