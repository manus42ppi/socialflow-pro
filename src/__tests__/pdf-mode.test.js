import { describe, it, expect } from 'vitest';
import { renderTemplate } from '../utils/spark-templates.js';

const BASE = {
  meta:{title:'T'}, nav:{logo:'X',links:[]}, colors:{primary:'#000',dark:'#111',light:'#eee',font:'Inter'},
  hero:{headline:'H',subtext:'S',cta1:'Go',label:''},
  features:{headline:'F',items:[]}, about:{headline:'A',text:'B',label:'L'},
  stats:[], quote:null,
  cta:{headline:'DL',subtext:'Now',buttonText:'PDF laden',label:''},
  footer:{groups:[],copyright:'2026'}
};

const PDF_URL = 'https://example.com/test.pdf';

describe('renderTemplate pdfMode', () => {
  it('direct: renders pdf link, NO email form', () => {
    const html = renderTemplate('product', BASE, PDF_URL, '', 'direct');
    expect(html).toContain(PDF_URL);
    expect(html).not.toContain('lead-form');
    expect(html).not.toContain('input[type="email"]');
  });

  it('email: renders email form, no plain pdf link', () => {
    const html = renderTemplate('product', BASE, PDF_URL, '', 'email');
    expect(html).toContain('lead-form');
    expect(html).not.toMatch(new RegExp(`href="${PDF_URL}"`));
  });

  it('direct: button text is the custom buttonText', () => {
    const html = renderTemplate('product', BASE, PDF_URL, '', 'direct');
    expect(html).toContain('PDF laden');
  });

  it('direct: no emailScript injected', () => {
    const html = renderTemplate('product', BASE, PDF_URL, '', 'direct');
    expect(html).not.toContain('email-capture');
  });
});
