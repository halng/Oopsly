# Theme & colors

Visual tokens used across the Oopsly UI. Prefer these over one-off hex values when adding screens.

## Color scheme

| Token | Hex | Usage |
| ----- | --- | ----- |
| Primary | `#8BC34A` | Main actions, brand accents |
| Secondary | `#FF9800` | Supporting elements |
| Accent | `#03A9F4` | Highlights, secondary CTAs |
| Background | `#F7F7F7` | App background |
| Surface | `#FFFFFF` | Cards / elevated surfaces |
| Text | `#212121` | Primary text |
| Text secondary | `#757575` | Secondary text |

Server-side theme enum: `com.app.oopsly.api.entity.Theme` (persisted on user settings).

## Layout defaults

| Token | Value |
| ----- | ----- |
| Font | System default (React Native) |
| Border radius | `rounded-lg` for cards and buttons |
| Padding | `p-4` for main containers |
| Margin | `m-2` for spacing elements |
| Shadow | `shadow-sm` for subtle depth |

## Implementation notes

- Styling is applied via **NativeWind 4** (Tailwind classes) in the Expo app.
- User theme preference syncs through `PATCH /user/settings`.
- Splash / adaptive icons are configured in `ui/app.json`.
