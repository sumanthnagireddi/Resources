import { CommonModule, NgClass } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject, OnInit, ViewChild } from '@angular/core';
import { Store } from '@ngrx/store';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { closeDialog } from '../../../store/actions/dialog.actions';
import { createBlog } from '../../../store/actions/blog.actions';
import { DialogComponent } from '../../dialogs/dialog/dialog.component';
import { EditorComponent } from '../../editor/editor.component';
import { ADFDoc } from '../../editor/atlas-editor.types';
import { TechnologyService } from '../../../services/technology.service';
import { RouterLink } from "@angular/router";

@Component({
  selector: 'app-add-blog',
  standalone: true,
  imports: [
    CommonModule,
    NgClass,
    ReactiveFormsModule,
    FormsModule,
    EditorComponent,
    RouterLink
  ],
  templateUrl: './add-blog.component.html',
  styleUrl: './add-blog.component.css',
})
export class AddBlogComponent implements OnInit {
  @ViewChild('editor') editor!: EditorComponent; // 🔥 reference child
  @Input() payload!: any;
  @Output() onDialogOutputButton = new EventEmitter<any>();

  form!: FormGroup;
  categories: any[] = [];
  step = 1;

  private readonly techService = inject(TechnologyService);

  constructor(private store: Store, private fb: FormBuilder) { }
  onEditorContent(content: ADFDoc) {
    this.form.patchValue({
      content,
    });
  }

  ngOnInit(): void {
    this.techService.getTechnologiesFromMongo().subscribe((data: any) => {
      this.categories = data;
    });

    this.form = this.fb.group({
      title: ['', Validators.required],
      description: [''],
      content: ['', Validators.required],

      category: [''],
      tags: [''], // 👈 string input

      status: ['DRAFT'],
      publishedAt: [null],
    });


    // Handle scheduled validation
    this.form.get('status')?.valueChanges.subscribe(status => {
      const publishedAtCtrl = this.form.get('publishedAt');
      if (status === 'SCHEDULED') {
        publishedAtCtrl?.setValidators([Validators.required]);
      } else {
        publishedAtCtrl?.clearValidators();
        publishedAtCtrl?.setValue(null);
      }
      publishedAtCtrl?.updateValueAndValidity();
    });
  }

  submit() {
    this.editor.getContent();
    const formValue = this.form.value;

    const tagsArray =
      formValue.tags
        ?.split(',')
        .map((tag: string) => tag.trim())
        .filter((tag: string) => tag.length > 0) || [];

    const payload = {
      ...formValue,
      tags: tagsArray,
    };

    // Handle publish / schedule
    if (payload.status === 'PUBLISHED' && !payload.publishedAt) {
      payload.publishedAt = new Date();
    }
    console.log('Submitting blog:', payload);
    this.store.dispatch(createBlog({ blog: payload }));
  }

  onDialogOutput() {
    this.onDialogOutputButton.emit();
  }

  onCloseDialog() {
    this.store.dispatch(closeDialog());
  }
}
