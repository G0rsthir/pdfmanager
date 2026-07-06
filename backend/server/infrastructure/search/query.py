from __future__ import annotations

import re
from dataclasses import dataclass, field

# A bare word defaults to an EXACT token match
DEFAULT_PREFIX = False


@dataclass(frozen=True, kw_only=True)
class TextTerm:
    value: str
    # '*': match tokens starting with 'value'
    prefix: bool = False
    # '-': exclude docs containing this
    negate: bool = False
    # '"..."': quoted string
    is_phrase: bool = False


@dataclass(frozen=True, kw_only=True)
class TextQuery:
    terms: list[TextTerm] = field(default_factory=list)

    @property
    def is_empty(self) -> bool:
        return not self.terms


_TOKEN_RE = re.compile(
    r"""
    (?P<neg>-)?                 # optional '-': exclude
    (?:
        "(?P<phrase>[^"]*)"     # optional "quoted phrase"
      | (?P<word>[^\s"*]+)      # optional bare word
    )
    (?P<star>\*)?               # optional '*': wildcard
    """,
    re.VERBOSE,
)


def parse_query(raw: str) -> TextQuery:
    terms: list[TextTerm] = []
    for m in _TOKEN_RE.finditer(raw or ""):
        is_phrase = m.group("phrase") is not None
        value = (m.group("phrase") if is_phrase else m.group("word")).strip()
        if not value:
            # skip empty
            continue

        terms.append(
            TextTerm(
                value=value,
                prefix=bool(m.group("star")) or DEFAULT_PREFIX,
                negate=bool(m.group("neg")),
                is_phrase=is_phrase,
            )
        )
    return TextQuery(terms=terms)
