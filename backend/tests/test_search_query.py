import pytest

from server.infrastructure.search.fts5 import NO_MATCH, compile_fts5
from server.infrastructure.search.query import TextQuery, TextTerm, parse_query


def term(
    value: str,
    *,
    prefix: bool = False,
    negate: bool = False,
    is_phrase: bool = False,
) -> TextTerm:
    return TextTerm(value=value, prefix=prefix, negate=negate, is_phrase=is_phrase)


# parse_query
@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("neural", [term("neural")]),
        ("neural network", [term("neural"), term("network")]),
        ("neur*", [term("neur", prefix=True)]),
        ('"machine learning"', [term("machine learning", is_phrase=True)]),
        (
            "deep learning -cnn",
            [term("deep"), term("learning"), term("cnn", negate=True)],
        ),
        (
            'trans* "back propagation" -rnn',
            [
                term("trans", prefix=True),
                term("back propagation", is_phrase=True),
                term("rnn", negate=True),
            ],
        ),
        ('-"foo bar"', [term("foo bar", negate=True, is_phrase=True)]),
        ('"a b"*', [term("a b", prefix=True, is_phrase=True)]),
        ('weird"quote*', [term("weird"), term("quote", prefix=True)]),
        ("AND OR NOT", [term("AND"), term("OR"), term("NOT")]),
        ("*", []),
        ("", []),
        ("   ", []),
    ],
)
def test_parse_query(raw: str, expected: list[TextTerm]) -> None:
    assert parse_query(raw).terms == expected


def test_is_empty() -> None:
    assert TextQuery().is_empty
    assert parse_query("").is_empty
    assert not parse_query("neural").is_empty


# compile_fts5
@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("neural", '"neural"'),
        ("neural network", '"neural" "network"'),
        ("neur*", '"neur"*'),
        ('"machine learning"', '"machine learning"'),
        ("deep learning -cnn", '"deep" "learning" NOT "cnn"'),
        ('trans* "back propagation" -rnn', '"trans"* "back propagation" NOT "rnn"'),
        ("keep -a -b", '"keep" NOT "a" NOT "b"'),
        ("AND OR NOT", '"AND" "OR" "NOT"'),
        ('"a b"*', '"a b"'),
        ("*", NO_MATCH),
        ("", NO_MATCH),
        ("-onlyexclude", NO_MATCH),
        ('-"foo bar"', NO_MATCH),
    ],
)
def test_compile_fts5(raw: str, expected: str) -> None:
    assert compile_fts5(parse_query(raw)) == expected
