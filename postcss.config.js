export default {
	plugins: {
		'postcss-import': {},
		'@tailwindcss/postcss': {},
		autoprefixer: {},
		cssnano: process.env.NODE_ENV === 'production' ? {} : false,
	},
}
