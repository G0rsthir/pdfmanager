from dataclasses import dataclass, field
from datetime import datetime
from enum import StrEnum

ATOM_NS = "http://www.w3.org/2005/Atom"
OPENSEARCH_NS = "http://a9.com/-/spec/opensearch/1.1/"


class OpdsRel(StrEnum):
    # Atom / navigation
    SELF = "self"
    START = "start"
    UP = "up"
    NEXT = "next"
    PREVIOUS = "previous"
    SEARCH = "search"
    ALTERNATE = "alternate"
    SUBSECTION = "subsection"  # a navigation entry pointing at a child feed
    # OPDS acquisition
    ACQUISITION = "http://opds-spec.org/acquisition"
    ACQUISITION_OPEN = "http://opds-spec.org/acquisition/open-access"
    # Images
    IMAGE = "http://opds-spec.org/image"
    THUMBNAIL = "http://opds-spec.org/image/thumbnail"
    # Discovery / organization
    FACET = "http://opds-spec.org/facet"
    SHELF = "http://opds-spec.org/shelf"
    SORT_NEW = "http://opds-spec.org/sort/new"
    SORT_POPULAR = "http://opds-spec.org/sort/popular"
    CRAWLABLE = "http://opds-spec.org/crawlable"


class OpdsLinkType(StrEnum):
    NAVIGATION = "application/atom+xml;profile=opds-catalog;kind=navigation"
    ACQUISITION = "application/atom+xml;profile=opds-catalog;kind=acquisition"
    OPENSEARCH = "application/opensearchdescription+xml"


@dataclass(kw_only=True)
class OpenSearchDescription:
    """
    OpenSearch 1.1 description document
    """

    short_name: str
    description: str
    url_template: str
    result_type: str = OpdsLinkType.ACQUISITION


@dataclass(kw_only=True)
class OpdsLink:
    href: str
    type: str
    rel: str
    title: str | None = None


@dataclass(kw_only=True)
class OpdsCategory:
    """
    Tag
    """

    term: str
    label: str | None = None


@dataclass(kw_only=True)
class OpdsAuthor:
    name: str
    uri: str | None = None
    email: str | None = None


@dataclass(kw_only=True)
class OpdsEntry:
    """
    OPDS Catalog Entry. Either a publication (file with acquisition links)
    or navigation section (a link to a child feed)
    """

    id: str
    title: str
    updated: datetime
    content: str | None = None
    categories: list[OpdsCategory] = field(default_factory=list)
    links: list[OpdsLink] = field(default_factory=list)


@dataclass(kw_only=True)
class OpdsFeed:
    """
    Catalog document
    """

    id: str
    title: str
    updated: datetime
    # RFC 4287 requires an author on the feed unless every entry carries one.
    author: OpdsAuthor | None = None
    links: list[OpdsLink] = field(default_factory=list)
    entries: list[OpdsEntry] = field(default_factory=list)
