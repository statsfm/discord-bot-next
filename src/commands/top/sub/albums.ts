import { Api, Range, TopAlbum } from '@statsfm/statsfm.js';
import { container } from 'tsyringe';
import type { TopCommand } from '../../../interactions';
import type { SubcommandFunction } from '../../../util/Command';
import {
  createEmbed,
  notLinkedEmbed,
  privacyEmbed,
  unexpectedErrorEmbed,
} from '../../../util/embed';
import { getDuration } from '../../../util/getDuration';
import { getStatsfmUserFromDiscordUser } from '../../../util/getStatsfmUserFromDiscordUser';
import {
  createPaginationComponentTypes,
  createPaginationManager,
} from '../../../util/PaginationManager';
import { PrivacyManager } from '../../../util/PrivacyManager';
import { URLs } from '../../../util/URLs';
import { reportError } from '../../../util/Sentry';
import { kAnalytics } from '../../../util/tokens';
import { Analytics } from '../../../util/analytics';

const statsfmApi = container.resolve(Api);
const privacyManager = container.resolve(PrivacyManager);
const analytics = container.resolve<Analytics>(kAnalytics);

const TopAlbumComponents = createPaginationComponentTypes('top-albums');

export const topAlbumsSubCommand: SubcommandFunction<
  typeof TopCommand['options']['albums']
> = async ({ interaction, args, statsfmUser: statsfmUserSelf, respond }) => {
  const targetUser = args.user?.user ?? interaction.user;
  const statsfmUser =
    targetUser === interaction.user
      ? statsfmUserSelf
      : await getStatsfmUserFromDiscordUser(targetUser);
  if (!statsfmUser) {
    await analytics.trackEvent(
      'TOP_ALBUMS_target_user_not_linked',
      interaction.user.id
    );
    return respond(interaction, {
      embeds: [notLinkedEmbed(targetUser)],
    });
  }

  const privacySettingCheck = privacyManager.doesHaveMatchingPrivacySettings(
    'topAlbums',
    statsfmUser.privacySettings
  );
  if (!privacySettingCheck) {
    await analytics.trackEvent('TOP_ALBUMS_privacy', interaction.user.id);
    return respond(interaction, {
      embeds: [
        privacyEmbed(
          targetUser,
          privacyManager.getPrivacySettingsMessage('topAlbums', 'topAlbums')
        ),
      ],
    });
  }

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

  let topAlbumsData: TopAlbum[] = [];

  try {
    topAlbumsData =
      (await statsfmApi.users.topAlbums(statsfmUser.id, {
        range,
      })) ?? [];
  } catch (err) {
    const errorId = reportError(err, interaction);

    return respond(interaction, {
      embeds: [unexpectedErrorEmbed(errorId)],
    });
  }

  if (topAlbumsData.length === 0) {
    await analytics.trackEvent(
      `TOP_ALBUMS_${range}_no_data`,
      interaction.user.id
    );
    return respond(interaction, {
      embeds: [
        createEmbed()
          .setAuthor({
            name: `${targetUser.username}'s top ${rangeDisplay} albums`,
            url: statsfmUser.profileUrl,
          })
          .setDescription('No albums found.'),
      ],
    });
  }

  await analytics.trackEvent(`TOP_ALBUMS_${range}`, interaction.user.id);

  const pagination = createPaginationManager(
    topAlbumsData,
    (currPage, totalPages, currData) => {
      return createEmbed()
        .setAuthor({
          name: `${targetUser.username}'s top ${rangeDisplay} albums`,
          url: statsfmUser.profileUrl,
        })
        .setDescription(
          currData
            .map((albumData) => {
              const albumUrl = URLs.AlbumUrl(albumData.album.id);

              return `${albumData.position}. [${
                albumData.album.name
              }](${albumUrl})${
                albumData.streams ? ` • **${albumData.streams}** streams` : ''
              }${
                albumData.playedMs
                  ? ` • ${getDuration(albumData.playedMs)}`
                  : ''
              }`;
            })
            .join('\n')
        )
        .setFooter({ text: `Page ${currPage}/${totalPages}` });
    }
  );

  const message = await respond(
    interaction,
    pagination.createMessage<'reply'>(
      await pagination.current(),
      TopAlbumComponents
    )
  );

  pagination.manageCollector(message, TopAlbumComponents, interaction.user);

  return message;
};
