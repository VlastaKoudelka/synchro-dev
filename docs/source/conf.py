# Configuration file for the Sphinx documentation builder.

# -- Project information

project = 'Synchro'
copyright = '2020-2026, Vlastimil Koudelka, Jan Hubený, National Institute of Mental Health (NUDZ)'
author = 'Vlastimil Koudelka, Jan Hubený'

release = '1.0'
version = '1.0.0'

# -- General configuration

extensions = [
    'sphinx.ext.duration',
    'sphinx.ext.mathjax',
]

templates_path = ['_templates']

# -- Options for HTML output

html_theme = 'sphinx_rtd_theme'
html_logo = 'images/logoPing.png'
html_static_path = ['_static']
# -- Options for EPUB output
epub_show_urls = 'footnote'
