/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      typography: {
        DEFAULT: {
          css: {
            lineHeight: '1lh',
            p: {
                marginTop: '1lh',
                marginBottom: '1lh',
            },
            '[class~="lead"]': {
                marginTop: '1lh',
                marginBottom: '1lh',
            },
            // blockquote: {
            //     marginTop: em(24, 18),
            //     marginBottom: em(24, 18),
            //     paddingInlineStart: em(20, 18),
            // },
            // h1: {
            //     fontSize: em(30, 14),
            //     marginTop: '0',
            //     marginBottom: em(24, 30),
            //     lineHeight: round(36 / 30),
            // },
            // h2: {
            //     fontSize: em(20, 14),
            //     marginTop: em(32, 20),
            //     marginBottom: em(16, 20),
            //     lineHeight: round(28 / 20),
            // },
            // h3: {
            //     fontSize: em(18, 14),
            //     marginTop: em(28, 18),
            //     marginBottom: em(8, 18),
            //     lineHeight: round(28 / 18),
            // },
            // h4: {
            //     marginTop: em(20, 14),
            //     marginBottom: em(8, 14),
            //     lineHeight: round(20 / 14),
            // },
            img: {
                marginTop: '1lh',
                marginBottom: '1lh',
            },
            picture: {
                marginTop: '1lh',
                marginBottom: '1lh',
            },
            video: {
                marginTop: '1.5lh',
                marginBottom: '1.5lh',
            },
            // kbd: {
            //     fontSize: em(12, 14),
            //     borderRadius: rem(5),
            //     paddingTop: em(2, 14),
            //     paddingInlineEnd: em(5, 14),
            //     paddingBottom: em(2, 14),
            //     paddingInlineStart: em(5, 14),
            // },
            code: {
                textWrap: 'auto',
            },
            // 'h2 code': {
            //     fontSize: em(18, 20),
            // },
            // 'h3 code': {
            //     fontSize: em(16, 18),
            // },
            pre: {
                lineHeight: '1lh',
                marginTop: '1lh',
                marginBottom: '1lh',
                paddingTop: '0.5lh',
                paddingInlineEnd: '1lh',
                paddingBottom: '0.5lh',
                paddingInlineStart: '1lh',
            },
            ol: {
                marginTop: '1lh',
                marginBottom: '1lh',
                paddingInlineStart: '1lh'
            },
            ul: {
                marginTop: '1lh',
                marginBottom: '1lh',
                paddingInlineStart: '1lh'
            },
            'p:has(+ ol), p:has(+ ul)': {
                marginBottom: '0.5lh'
            },
            'p + ol, p + ul': {
                marginTop: '0'
            },
            li: {
                marginTop: '0.5lh',
                marginBottom: '0.5lh',
            },
            'ol > li, ul > li': {
                paddingInlineStart: '0.5lh',
            },
            'ul ul, ul ol, ol ul, ol ol': {
                marginTop: '0.5lh',
                marginBottom: '0.5lh',
            },
            hr: {
                marginTop: '1lh',
                marginBottom: '1lh',
            },
          },
        },
      },
    },
  },
}
