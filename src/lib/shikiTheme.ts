import type { ThemeRegistration } from 'shiki';

/** Code theme matched to the site palette (ink / signal mint / amber). */
export const mcTheme: ThemeRegistration = {
  name: 'mc-signal',
  type: 'dark',
  colors: {
    'editor.background': '#070908',
    'editor.foreground': '#c4cbc6',
  },
  tokenColors: [
    { scope: ['comment', 'punctuation.definition.comment', 'string.quoted.docstring'], settings: { foreground: '#7d8a84', fontStyle: 'italic' } },
    { scope: ['string', 'string.quoted', 'string.template'], settings: { foreground: '#3df5a7' } },
    { scope: ['constant.numeric', 'constant.language', 'constant.character'], settings: { foreground: '#ffb547' } },
    { scope: ['keyword', 'storage', 'storage.type', 'keyword.control', 'keyword.operator.logical'], settings: { foreground: '#7ee0ff' } },
    { scope: ['entity.name.function', 'support.function.magic'], settings: { foreground: '#f2f5f0', fontStyle: 'bold' } },
    { scope: ['entity.name.type.class', 'entity.name.class', 'support.class', 'entity.other.inherited-class'], settings: { foreground: '#f2f5f0' } },
    { scope: ['support.function.builtin', 'support.type.python'], settings: { foreground: '#7ee0ff' } },
    { scope: ['meta.function.decorator', 'entity.name.function.decorator', 'punctuation.definition.decorator'], settings: { foreground: '#c792ea' } },
    { scope: ['variable.parameter', 'variable.parameter.function.language.special.self', 'variable.language.special.self'], settings: { foreground: '#d7b4ff' } },
    { scope: ['keyword.operator', 'punctuation'], settings: { foreground: '#8b958f' } },
  ],
};
