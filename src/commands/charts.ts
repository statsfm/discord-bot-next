import { APIInteraction, InteractionResponseType } from 'discord-api-types/v9';

import { ChartsCommand } from '../interactions';
import type { ArgumentsOf } from '../util/ArgumentsOf';
import type { ICommand, RespondFunction } from '../util/Command';

export default class implements ICommand {
  commandObject = ChartsCommand;

  public async execute(
    interaction: APIInteraction,
    _args: ArgumentsOf<typeof ChartsCommand>,
    respond: RespondFunction
  ): Promise<void> {
    await respond(interaction, {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        content: 'Pong!',
      },
    });
  }
}
