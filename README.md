GitHub Pages Deployment

This branch contains the production build used to serve the live version of the project through GitHub Pages.


How deployment works

main branch - contains the project's source code and development files, synced from the local files through VS Code.
Backup branch - is a replica of the main branch. This was created as a backup after the project files were lost from local storage.
gh-pages branch - contains the generated production build from the main branch and is used for deployment. Everything in this branch is generated from the main branch.
GitHub Pages -publishes the contents of this gh-page branch as the live website.

Changes made to the source code in the main branch are built, and the resulting production files are published to this gh-page branch.

The live site is therefore served from gh-page, while the source project is maintained in the main branch.
