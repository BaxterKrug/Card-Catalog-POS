from fastapi import APIRouter
import subprocess
from pathlib import Path

router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/run-tests")
def run_tests():
    """Run the project's test suite (pytest) and return stdout/stderr.

    Intended for local/dev use only.
    """
    repo_root = Path(__file__).resolve().parents[2]
    try:
        # Run pytest in the repository root
        result = subprocess.run(
            ["pytest", "-q"],
            cwd=str(repo_root),
            capture_output=True,
            text=True,
            timeout=120,
        )
    except subprocess.TimeoutExpired as exc:
        return {"status": "timeout", "output": str(exc)}

    # Truncate output to avoid huge payloads
    out = (result.stdout or "") + ("\n" + (result.stderr or "") if result.stderr else "")
    max_len = 20_000
    if len(out) > max_len:
        out = out[:max_len] + "\n...output truncated..."

    return {
        "returncode": result.returncode,
        "output": out,
    }
