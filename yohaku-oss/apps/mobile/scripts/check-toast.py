"""Run on an installed current build, with /dev open in English or Simplified Chinese.
Usage: python3 scripts/check-toast.py <simulator-udid>
Requires AXe; exercises native input, accessibility, and real dismissal timers.
"""
import json
import shlex
import subprocess
import sys
import time

udid = sys.argv[1]


def axe(*args):
    return subprocess.check_output(['axe', *args, '--udid', udid], text=True)


def elements():
    def walk(nodes):
        for node in nodes:
            yield node
            yield from walk(node.get('children', []))
    return list(walk(json.loads(axe('describe-ui'))))


def toasts():
    return [item for item in elements() if item.get('AXUniqueId') == 'yohaku.toast']


def tap(label):
    frame = next(item['frame'] for item in controls if item.get('AXLabel') == label)
    axe('tap', '-x', str(frame['x'] + frame['width'] / 2),
        '-y', str(frame['y'] + frame['height'] / 2))


controls = elements()
labels = {item.get('AXLabel') for item in controls}
single, stack = ('Show toast', 'Show stacked toasts') if 'Show toast' in labels else ('弹出 Toast', '弹出一组 Toast')
assert single in labels and stack in labels, 'Open the /dev screen first'
time.sleep(3)
# Keep the renewal sequence inside one HID session; AX inspection itself can take a second.
axe('batch', '--step', f'tap --label {shlex.quote(single)}', '--step', 'sleep 1.8',
    '--step', f'tap --label {shlex.quote(single)}', '--step', 'sleep 0.5')
assert len(toasts()) == 1, 'Duplicate did not extend the existing toast lifetime'
time.sleep(2.8)
assert not toasts(), 'Toast did not automatically dismiss'
print('PASS: duplicate renews lifetime; auto-dismiss removes toast')

tap(single)
tap(stack)  # The overlay must allow the underlying button to receive this tap.
items = toasts()
assert len(items) == 1, 'Back layers must not expose old messages'
assert items[0]['AXLabel'] in ('Changes saved', '更改已保存'), 'Latest message is not in front'
time.sleep(2.8)
assert not toasts(), 'Old messages resurfaced after group dismissal'
print('PASS: touches pass through; latest message only; entire stack dismisses')

tap(stack)
frame = toasts()[0]['frame']
x, y = frame['x'] + frame['width'] / 2, frame['y'] + frame['height'] / 2
axe('swipe', '--start-x', str(x), '--start-y', str(y),
    '--end-x', str(x), '--end-y', str(max(1, y - 65)), '--duration', '0.2')
time.sleep(0.35)
assert not toasts(), 'Upward swipe did not dismiss the group'
tap(single)
assert len(toasts()) == 1, 'A new toast cannot appear after swipe dismissal'
print('PASS: upward swipe dismisses stack; subsequent toast works')
