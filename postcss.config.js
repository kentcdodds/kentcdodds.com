export default {
	plugins: {
		'postcss-import': {},
		tailwindcss: {},
		autoprefixer: {},
		cssnano: process.env.NODE_ENV === 'production' ? {} : false,
	},
}
