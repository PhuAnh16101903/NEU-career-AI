import re
from functools import lru_cache
from typing import Any

from app.core.config import settings

_PLACEHOLDER = re.compile(r"\{\{\s*(\w+)\s*\}\}")


@lru_cache(maxsize=None)
def _load_template(name: str) -> str:
    path = settings.PROMPTS_DIR / f"{name}.txt"
    if not path.is_file():
        raise FileNotFoundError(f"Không tìm thấy prompt '{name}' tại {path}")
    return path.read_text(encoding="utf-8")


def render_prompt(name: str, **variables: Any) -> str:
    """
    Đọc ai/prompts/<name>.txt và thay các placeholder {{ten_bien}}.
    Ném KeyError nếu thiếu biến, để prompt không bao giờ được gửi đi với placeholder còn sót.
    """
    template = _load_template(name)
    required = set(_PLACEHOLDER.findall(template))
    missing = required - variables.keys()
    if missing:
        raise KeyError(f"Prompt '{name}' thiếu biến: {', '.join(sorted(missing))}")
    return _PLACEHOLDER.sub(lambda m: str(variables[m.group(1)]), template)
