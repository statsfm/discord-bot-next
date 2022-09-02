import { StatsCommand } from '../interactions';
import { createCommand } from '../util/Command';
import { getUserByDiscordId } from '../util/getUserByDiscordId';
import { createEmbed, notLinkedEmbed } from '../util/embed';
import { container } from 'tsyringe';
import { Api, Range } from '@statsfm/statsfm.js';
import { URLs } from '../util/URLs';

const statsfmApi = container.resolve(Api);

export default createCommand(StatsCommand)
  .registerChatInput(async (interaction, args, respond) => {
    await interaction.deferReply();
    const interactionUser = interaction.user;
    const targetUser = args.user?.user ?? interactionUser;
    const data = await getUserByDiscordId(targetUser.id);
    if (!data)
      return respond(interaction, {
        embeds: [notLinkedEmbed(targetUser)],
      });

    let range = Range.WEEKS;
    let rangeDisplay = 'past 4 weeks';

    if (args.range === '6-months') {
      range = Range.MONTHS;
      rangeDisplay = 'past 6 months';
    }

    if (args.range === 'lifetime') {
      range = Range.LIFETIME;
      rangeDisplay = 'lifetime';
    }

    const stats = await statsfmApi.users.stats(data.userId, {
      range,
    });

    return respond(interaction, {
      embeds: [
        createEmbed()
          .setAuthor({
            name: `${targetUser.username}'s stats - ${rangeDisplay}`,
            url: URLs.ProfileUrl(data.userId),
          })
          .addFields([
            {
              name: `Streams`,
              value: `${stats.count.toLocaleString() ?? 0}`,
              inline: true,
            },
            {
              name: `Minutes streamed`,
              value: `${Math.round(
                (stats.durationMs ?? 0) / 1000 / 60
              ).toLocaleString()} minutes`,
              inline: true,
            },
            {
              name: `Hours streamed`,
              value: `${Math.round(
                (stats.durationMs ?? 0) / 1000 / 60 / 60
              ).toLocaleString()} hours`,
              inline: true,
            },
            {
              name: `Different tracks`,
              value: `${stats.cardinality.tracks.toLocaleString() ?? 0} tracks`,
              inline: true,
            },
            {
              name: `Different artists`,
              value: `${
                stats.cardinality.artists.toLocaleString() ?? 0
              } artists`,
              inline: true,
            },
            {
              name: `Different albums`,
              value: `${stats.cardinality.albums.toLocaleString() ?? 0} albums`,
              inline: true,
            },
          ])
          .toJSON(),
      ],
    });
  })
  .build();
