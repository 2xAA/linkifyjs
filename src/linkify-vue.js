import * as linkify from 'linkifyjs/lib/linkify';

const VueLinkify = {};

const { options } = linkify;
const { Options } = options;

// Given a string, converts to an array of VNodes
// (which may include strings)
function stringToElements (str, opts, createElement) {
	let tokens = linkify.tokenize(str);
	let elements = [];
	var linkId = 0;

	for (var i = 0; i < tokens.length; i++) {
		let token = tokens[i];

		if (token.type === 'nl' && opts.nl2br) {
			elements.push(createElement('br', {
				props: {
					key: `linkified-${++linkId}`
				}
			}));
			continue;
		} else if (!token.isLink || !opts.check(token)) {
			// Regular text
			elements.push(token.toString());
			continue;
		}

		let {
			href, //eslint-disable-line
			formatted,
			formattedHref,
			tagName,
			className,
			target,
			attributes,
			events //eslint-disable-line
		} = opts.resolve(token);

		let props = {
			key: `linkified-${++linkId}`
		};

		const attrs = {
			href: formattedHref
		};

		if (className) {
			attrs.class = className;
		}

		if (target) {
			attrs.target = target;
		}

		// Build up additional attributes
		// Support for events via attributes hash
		if (attributes) {
			for (var attr in attributes) {
				attrs[attr] = attributes[attr];
			}
		}

		elements.push(createElement(tagName, { props, attrs }, [ formatted ]));
	}

	return elements;
}

// Recursively linkify the contents of the given Vue Element instance
function linkifyVnode (element, opts, elementId = 0, createElement) {
	if (typeof element.children === 'undefined') {
		// No need to clone if the element had no children
		return element;
	}

	let children = [];

	if (element.children) {
		element.children.forEach((child) => {
			if (typeof child.text === 'string' && typeof child.tag === 'undefined') {
				children.push(...stringToElements(child.text, opts, createElement));
			} else if (child.constructor.name === 'VNode') { // @todo find less hacky way of detecting VNode (can you import the VNode class for instanceof?)
				if (typeof child.type === 'string' &&
					options.contains(opts.ignoreTags, child.type.toUpperCase())
				) {
					// Don't linkify this element
					children.push(child);
				} else {
					children.push(linkifyVnode(child, opts, ++elementId, createElement));
				}
			} else {
				// Unknown element type, just push
				children.push(child);
			}
		});
	}

	// Set a default unique key, copy over remaining props
	let newProps = { key: `linkified-element-${elementId}` };
	for (var prop in element.context.$props) {
		newProps[prop] = element.context.$props[prop];
	}

	return createElement(element.tag || element.context.$props.tagName, newProps, children);
}

function render (createElement, context) {
	// Copy over all non-linkify-specific props
	let newProps = { key: 'linkified-element-0' };

	Object.keys(context.props).forEach((prop) => {
		if (prop !== 'options' && prop !== 'tagName') {
			newProps[prop] = context.props[prop];
		}
	});

	let opts = new Options(context.props.options);
	let tagName = context.props.tagName || 'span';
	let element = createElement(tagName, { props: newProps }, context.slots().default);

	if (context.props.makeLinks) {
		return linkifyVnode(element, opts, 0, createElement);
	}

	return createElement(
		element.tag || element.context.$props.tagName,
		{ props: newProps },
		context.slots().default
	);
}

VueLinkify.install = (Vue) => {
	Vue.component('linkify', {
		functional: true,
		render,
		props: {
			tagName: {
				type: String,
				default: 'span'
			},
			makeLinks: {
				type: Boolean,
				default: false
			},
			options: {
				type: Object,
				default: () => {}
			}
		},
		name: 'linkify'
	});
};

export default VueLinkify;
