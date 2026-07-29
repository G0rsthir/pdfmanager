from datetime import UTC, datetime
from xml.sax.saxutils import escape, quoteattr

from server.infrastructure.opds.document import (
    ATOM_NS,
    OPENSEARCH_NS,
    OpdsAuthor,
    OpdsCategory,
    OpdsEntry,
    OpdsFeed,
    OpdsLink,
    OpenSearchDescription,
)


def _iso_datetime(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)
    return dt.astimezone(UTC).isoformat()


def _render_link(link: OpdsLink) -> str:
    attrs = f"href={quoteattr(link.href)} type={quoteattr(link.type)} rel={quoteattr(link.rel)}"
    if link.title:
        attrs += f" title={quoteattr(link.title)}"
    return f"<link {attrs}/>"


def _render_category(category: OpdsCategory) -> str:
    attrs = f"term={quoteattr(category.term)}"
    if category.label:
        attrs += f" label={quoteattr(category.label)}"
    return f"<category {attrs}/>"


def _render_author(author: OpdsAuthor) -> str:
    parts = [f"<author><name>{escape(author.name)}</name>"]
    if author.uri:
        parts.append(f"<uri>{escape(author.uri)}</uri>")
    if author.email:
        parts.append(f"<email>{escape(author.email)}</email>")
    parts.append("</author>")
    return "".join(parts)


def _render_entry(entry: OpdsEntry) -> str:
    parts = [
        "<entry>",
        f"<id>{escape(entry.id)}</id>",
        f"<title>{escape(entry.title)}</title>",
        f"<updated>{_iso_datetime(entry.updated)}</updated>",
    ]
    if entry.content:
        parts.append(f'<content type="text">{escape(entry.content)}</content>')
    parts.extend(_render_category(c) for c in entry.categories)
    parts.extend(_render_link(link) for link in entry.links)
    parts.append("</entry>")
    return "".join(parts)


def render_feed(feed: OpdsFeed) -> str:
    parts = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        f'<feed xmlns="{ATOM_NS}">',
        f"<id>{escape(feed.id)}</id>",
        f"<title>{escape(feed.title)}</title>",
        f"<updated>{_iso_datetime(feed.updated)}</updated>",
    ]
    if feed.author:
        parts.append(_render_author(feed.author))
    parts.extend(_render_link(link) for link in feed.links)
    parts.extend(_render_entry(entry) for entry in feed.entries)
    parts.append("</feed>")
    return "".join(parts)


def render_opensearch(doc: OpenSearchDescription) -> str:
    """
    Render OpenSearch description document
    """
    return "".join(
        [
            '<?xml version="1.0" encoding="UTF-8"?>',
            f'<OpenSearchDescription xmlns="{OPENSEARCH_NS}">',
            f"<ShortName>{escape(doc.short_name)}</ShortName>",
            f"<Description>{escape(doc.description)}</Description>",
            "<InputEncoding>UTF-8</InputEncoding>",
            "<OutputEncoding>UTF-8</OutputEncoding>",
            f"<Url type={quoteattr(doc.result_type)} template={quoteattr(doc.url_template)}/>",
            "</OpenSearchDescription>",
        ]
    )
