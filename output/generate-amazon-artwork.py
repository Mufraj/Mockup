"""Compatibility entry point for the benchmark storefront generator."""
from pathlib import Path
import runpy
runpy.run_path(str(Path(__file__).with_name('generate-benchmark-artwork.py')),run_name='__main__')
