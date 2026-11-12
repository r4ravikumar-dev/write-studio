import type {JSONContent} from '../caseStudies/json';
import type {BlockName} from './catalog';

/**
 * One realistic stored node per block and version (block contract B4, §3.3 checks 2–4). These are
 * shapes the editor really writes (several come from the browser suite's document); when a block's
 * stored shape changes, its old fixture stays and a new version's is added, and the migration must
 * turn the one into the other. Never edit a released fixture to make a test pass.
 */
const OWNER = '1b6f7f2e-5a7d-4c21-9b8e-3d2c1a0f9e8d';
const SPACE = '7c3e9a10-2b4d-4f6e-8a1c-5d7e9f0a2b4c';
const DOC = '9f8e7d6c-5b4a-4c3d-8e2f-1a0b9c8d7e6f';
const file = (n: number, ext = 'png') => `${OWNER}/${SPACE}/${DOC}/00000000-0000-4000-8000-${String(n).padStart(12, '0')}.${ext}`;
const picture = (n: number, alt: string) => ({path: file(n), kind: 'image', alt, width: 1440, height: 900, caption: ''});
const p = (text: string, marks?: JSONContent['marks']): JSONContent => ({type: 'paragraph', content: [{type: 'text', text, ...(marks ? {marks} : {})}]});

export const BLOCK_FIXTURES: Record<BlockName, Record<number, JSONContent>> = {
  paragraph: {
    1: {
      type: 'paragraph',
      attrs: {textRole: 'lead', textAlign: null},
      content: [
        {type: 'text', text: 'Booking took ', marks: [{type: 'bold'}]},
        {type: 'text', text: 'four minutes', marks: [{type: 'link', attrs: {href: 'https://example.com/study', target: '_blank', rel: 'noopener noreferrer', class: null, title: null}}]},
        {type: 'text', text: ' on average.', marks: [{type: 'textStyle', attrs: {color: 'var(--color-text-blue)', fontWeight: '600', backgroundColor: null, fontFamily: null, fontSize: null, lineHeight: null, letterSpacing: null, textTransform: null}}]},
      ],
    },
  },
  heading: {1: {type: 'heading', attrs: {level: 3, textAlign: 'center', section: null, sectionId: null, sectionStatus: null}, content: [{type: 'text', text: 'What we learned'}]}},
  blockquote: {1: {type: 'blockquote', content: [p('Every step felt like starting again.')]}},
  bulletList: {1: {type: 'bulletList', content: [{type: 'listItem', content: [p('Fewer steps')]}, {type: 'listItem', content: [p('Clearer prices')]}]}},
  orderedList: {1: {type: 'orderedList', attrs: {start: 1, type: null}, content: [{type: 'listItem', content: [p('Search')]}, {type: 'listItem', content: [p('Book')]}]}},
  taskList: {1: {type: 'taskList', content: [{type: 'taskItem', attrs: {checked: true}, content: [p('Interview six patients')]}, {type: 'taskItem', attrs: {checked: false}, content: [p('Test the prototype')]}]}},
  details: {1: {type: 'details', attrs: {open: false}, content: [{type: 'detailsSummary', content: [{type: 'text', text: 'Method'}]}, {type: 'detailsContent', content: [p('Six moderated sessions, 45 minutes each.')]}]}},
  codeBlock: {
    1: {type: 'codeBlock', attrs: {language: 'json'}, content: [{type: 'text', text: '{\n  "status": "booked"\n}'}]},
    2: {type: 'codeBlock', attrs: {language: 'typescript', title: 'book.ts', lineNumbers: true, wrap: false}, content: [{type: 'text', text: 'const booking = await client.bookings.create({clinicId});\nconsole.log(booking.status);'}]},
  },
  terminal: {
    1: {
      type: 'terminal',
      attrs: {shell: 'bash', prompt: '$'},
      content: [
        {type: 'terminalCommand', content: [{type: 'text', text: 'npm install @clinic/sdk'}]},
        {type: 'terminalOutput', content: [{type: 'text', text: 'added 12 packages in 2s'}]},
        {type: 'terminalCommand', content: [{type: 'text', text: 'npx clinic login'}]},
      ],
    },
  },
  parameterTable: {
    1: {
      type: 'parameterTable',
      attrs: {showRequired: true, showDefault: true},
      content: [
        {type: 'parameter', attrs: {name: 'clinicId', type: 'string', required: true, default: ''}, content: [p('The clinic to book at.')]},
        {type: 'parameter', attrs: {name: 'timeout', type: 'number', required: false, default: '30'}, content: [p('Seconds to wait for a free slot.')]},
      ],
    },
  },
  requirementList: {
    1: {
      type: 'requirementList',
      content: [
        {type: 'requirement', attrs: {reqId: 'FR-1', priority: 'must'}, content: [p('Patients can book a slot without an account.')]},
        {type: 'requirement', attrs: {reqId: 'FR-2', priority: null}, content: [p('The price is shown before the slot is chosen.')]},
      ],
    },
  },
  userStory: {
    1: {
      type: 'userStory',
      content: [
        {type: 'storyPart', attrs: {part: 'role'}, content: [{type: 'text', text: 'a patient with a sick child'}]},
        {type: 'storyPart', attrs: {part: 'goal'}, content: [{type: 'text', text: 'to book the earliest slot tonight'}]},
        {type: 'storyPart', attrs: {part: 'benefit'}, content: [{type: 'text', text: 'my child is seen before morning'}]},
      ],
    },
  },
  acceptanceCriteria: {
    1: {
      type: 'acceptanceCriteria',
      content: [
        {
          type: 'scenario',
          attrs: {title: 'Booking without an account', requirementRef: 'FR-1'},
          content: [
            {type: 'scenarioStep', attrs: {keyword: 'given'}, content: [{type: 'text', text: 'I am not signed in'}]},
            {type: 'scenarioStep', attrs: {keyword: 'when'}, content: [{type: 'text', text: 'I choose a free slot'}]},
            {type: 'scenarioStep', attrs: {keyword: 'then'}, content: [{type: 'text', text: 'the slot is held for 10 minutes'}]},
            {type: 'scenarioStep', attrs: {keyword: 'and'}, content: [{type: 'text', text: 'I am asked for a phone number'}]},
          ],
        },
      ],
    },
  },
  testimonial: {
    1: {
      type: 'testimonial',
      attrs: {person: 'Dr Asha Rao', role: 'Practice manager', organisation: 'Northside Clinic', consent: 'approved', photo: file(13)},
      content: [p('Our evening appointments filled up within a week.')],
    },
  },
  procedureSteps: {
    1: {
      type: 'procedureSteps',
      content: [
        {type: 'procedureStep', attrs: {owner: 'Support lead', expected: 'The ticket is marked urgent.'}, content: [p('Check the patient’s booking in the admin panel.')]},
        {type: 'procedureStep', attrs: {owner: '', expected: ''}, content: [p('Call the clinic if the slot was lost.')]},
      ],
    },
  },
  referenceList: {
    1: {
      type: 'referenceList',
      content: [
        {type: 'reference', attrs: {url: 'https://developers.google.com/style', kind: 'website'}, content: [{type: 'text', text: 'Google developer documentation style guide'}]},
        {type: 'reference', attrs: {url: '', kind: 'issue'}, content: [{type: 'text', text: 'Ticket BOOK-412'}]},
      ],
    },
  },
  horizontalRule: {1: {type: 'horizontalRule'}},
  spacer: {1: {type: 'spacer', attrs: {size: 'lg'}}},
  table: {
    1: {
      type: 'table',
      attrs: {tableStyle: 'rows', striped: true, density: 'compact', mobile: 'fit'},
      content: [
        {type: 'tableRow', content: [{type: 'tableHeader', attrs: {colspan: 1, rowspan: 1, colwidth: null, align: null}, content: [p('Metric')]}, {type: 'tableHeader', attrs: {colspan: 1, rowspan: 1, colwidth: null, align: 'right'}, content: [p('Value')]}]},
        {type: 'tableRow', content: [{type: 'tableCell', attrs: {colspan: 1, rowspan: 1, colwidth: null, align: null}, content: [p('Bookings')]}, {type: 'tableCell', attrs: {colspan: 1, rowspan: 1, colwidth: [120], align: 'right'}, content: [p('180')]}]},
      ],
    },
  },
  callout: {1: {type: 'callout', attrs: {tone: 'warning', icon: 'alert'}, content: [p('Half of patients gave up before paying.')]}},
  pullQuote: {1: {type: 'pullQuote', attrs: {config: {style: 'serif', attribution: 'A patient', role: 'Interview 4', align: 'center'}}, content: [{type: 'text', text: 'I just want to see a doctor tonight.'}]}},
  image: {
    1: {
      type: 'image',
      attrs: {src: file(1), alt: 'The new booking screen', title: null, width: 400, height: 250, decorative: false, size: 'medium', align: 'left', ratio: '4/3', focus: 'top', credit: 'Test credit', radius: 'md'},
    },
  },
  videoFile: {1: {type: 'videoFile', attrs: {src: file(2, 'webm'), caption: 'Booking in under a minute'}}},
  fileAttachment: {1: {type: 'fileAttachment', attrs: {src: file(3, 'pdf'), name: 'Research report.pdf', size: 482113, mime: 'application/pdf', preview: true}}},
  embed: {1: {type: 'embed', attrs: {src: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', caption: 'The prototype walkthrough'}}},
  imageGrid: {
    1: {
      type: 'imageGrid',
      attrs: {config: {items: [picture(4, 'Sketches'), picture(5, 'Wireframes')], columns: 3, arrangement: 'even', ratio: '1:1', gap: 'sm', caption: 'Grid caption', mobileColumns: 1, responsive: {tablet: {columns: 2}}}},
    },
  },
  comparison: {
    1: {
      type: 'comparison',
      attrs: {config: {mode: 'before-after', display: 'slider', split: '50-50', ratio: '16:9', left: {media: picture(6, 'The old form'), label: 'Before', text: 'Seven fields.'}, right: {media: picture(7, 'The new form'), label: 'After', text: 'Two fields.'}, caption: ''}},
    },
  },
  showcase: {1: {type: 'showcase', attrs: {config: {media: picture(8, 'The booking app on a phone'), ratio: '16:9', focus: 'center', width: 'frame', surface: 'muted', inset: 'md', caption: 'The final design'}}}},
  deviceMockup: {
    1: {
      type: 'deviceMockup',
      attrs: {
        config: {
          preset: 'custom',
          stageRatio: '16:9',
          spacing: 'loose',
          surface: 'muted',
          shadow: true,
          mobile: 'stack',
          caption: '',
          devices: [
            {id: 'dA', type: 'laptop', media: picture(9, 'Dashboard'), x: 30.5, y: 50, scale: 1, rotate: 0, z: 1, groupId: 'g1'},
            {id: 'dB', type: 'phone', media: null, x: 70, y: 55.5, scale: 0.9, rotate: -15, z: 2, locked: true, groupId: 'g1'},
          ],
        },
      },
    },
  },
  splitLayout: {1: {type: 'splitLayout', attrs: {config: {media: picture(10, 'A clinic waiting room'), order: 'text-media', proportion: '40-60', align: 'center', ratio: '4:3', width: 'wide', surface: 'none'}}, content: [{type: 'heading', attrs: {level: 3, textAlign: null, section: null, sectionId: null, sectionStatus: null}, content: [{type: 'text', text: 'The context'}]}, p('Clinics fill up by 9am.')]}},
  annotatedImage: {
    1: {
      type: 'annotatedImage',
      attrs: {config: {media: picture(11, 'The checkout screen'), annotations: [{id: 'a1', x: 20, y: 30, title: 'Price', text: 'Shown before the slot is chosen.'}], ratio: 'auto', notes: 'side', caption: ''}},
    },
  },
  screenSequence: {
    1: {
      type: 'screenSequence',
      attrs: {config: {steps: [{id: 's1', media: picture(12, 'Search'), title: 'Search', text: 'Pick a clinic.'}, {id: 's2', media: null, title: 'Pay', text: ''}], frame: 'phone', columns: 3, arrows: true, ratio: '9:16', caption: '', responsive: {phone: {columns: 1}}}},
    },
  },
  metrics: {1: {type: 'metrics', attrs: {config: {items: [{value: '32%', label: 'Faster booking', detail: 'Median, March'}], style: 'cards', columns: 3, caption: '', size: 'large', align: 'center', surface: 'brand', responsive: {tablet: {columns: 2}, phone: {columns: 1}}}}}},
  chart: {
    1: {
      type: 'chart',
      attrs: {config: {kind: 'line', title: 'Weekly bookings', unit: '', points: [{id: 'c1', label: 'Week 1', value: 120}, {id: 'c2', label: 'Week 2', value: 180.5}], target: 100, summary: 'Bookings rose.', caption: '', source: 'Analytics'}},
    },
  },
  researchInsights: {
    1: {type: 'researchInsights', attrs: {config: {insights: [{id: 'i1', finding: 'People book at night.', evidence: '6 of 8', source: 'Interviews'}], layout: 'list', columns: 2, numbered: false, caption: ''}}},
  },
  timeline: {1: {type: 'timeline', attrs: {config: {layout: 'vertical', style: 'cards', phases: [{id: 'p1', when: 'March', title: 'Discover', text: 'Interviews.'}], caption: ''}}}},
  flowDiagram: {
    1: {
      type: 'flowDiagram',
      attrs: {config: {direction: 'vertical', nodes: [{id: 'n1', kind: 'start', label: 'Open the app', next: ''}, {id: 'n2', kind: 'decision', label: 'Signed in?', next: 'Yes'}, {id: 'n3', kind: 'end', label: 'Booked', next: ''}], caption: ''}},
    },
  },
};
