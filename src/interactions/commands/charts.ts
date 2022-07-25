import { ApplicationCommandOptionType } from 'discord-api-types/v9';

export const ChartsCommand = {
  name: 'charts',
  description: 'Show global charts',
  options: [
    {
      name: 'type',
      description: 'Type',
      type: ApplicationCommandOptionType.String,
      required: true,
      choices: [
        {
          name: 'Users',
          value: 'users',
        },
        {
          name: 'Tracks',
          value: 'tracks',
        },
        {
          name: 'Albums',
          value: 'albums',
        },
        {
          name: 'Artists',
          value: 'artists',
        },
      ],
    },
  ],
} as const;
