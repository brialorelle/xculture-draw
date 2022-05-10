
## basic library requirements
from __future__ import division

import os
import io
import urllib, cStringIO

import numpy as np
import scipy.stats as stats
import pandas as pd
import json
import re

from PIL import Image
import base64
import datetime
import time

# exclude IDs
exclude_ids = ['102618_3',
'111218_7',
'112818_3',
'121918_1',
'010919_5',
'010919_10',
'test',
'012119_8'
'012119_9',
'Test',
'']

# set path to database connectinos 
auth = pd.read_csv('auth.txt', header = None) 
pswd = auth.values[0][0]
user = 'stanford'
host = 'stanford-cogsci.org' ## cocolab ip address

## use pymongo for database
import pymongo as pm
conn = pm.MongoClient('mongodb://stanford:' + pswd + '@127.0.0.1')
db = conn['kiddraw']
photodraw_e2 = db['CDM_photodraw_e2']

###### ###### ###### TOGGLE HERE WHICH DATABSE
this_collection = photodraw_e2
which_run = 'CDM_photodraw_e2'
###### ###### ###### ######

###### Where are we rendering these sketches?
analysis_dir = os.getcwd()
sketch_dir = os.path.join(analysis_dir,'photodraw2_all_sketches_svg_copy')
if not os.path.exists(sketch_dir):
    os.makedirs(sketch_dir)

output_dir = os.path.join(analysis_dir,'photodraw2_svg')
if not os.path.exists(output_dir):
    os.makedirs(output_dir)

###### Open up variables for CSV writing
# # basic descriptors
session_id = []; trial_num = []; category = []; age = []; filename = []

# # photodraw2 specific
ref_image_name = [] #imageName
condition = [] #condition
subID = [] #subID
CB = [] #CB
# for stroke data specifically
svg = []
stroke_count = []

ref_image_name

######MASSIVE LOOP TO RENDER OUT IMAGES & INFO
# basic variables for counting throughout the loop
skipCount = 0;
writeImageCount = 0;
timeSave = []
imsize = 224 ## img writing size, optimized for CNN
countImage = 0
alreadyWritten = 0

skipCount_P=0
skipCount_S=0

## Get all sessions within this collection
subIDS_to_render =  this_collection.find({'$and': [{'dataType':'finalImage'},{'subID': {"$nin": exclude_ids}}]}).distinct('subID')
print 'We currently have {} total subIDs after exclusions/tests.'.format(len(subIDS_to_render))

time_start = time.time() ## 
count_subs = 0 

## Go through each session
for s in subIDS_to_render:   
    count_subs = count_subs +1   
    # in the latest version of museumstation (cdm_run_v4), more info on timing and survey for exclusions
    image_recs = this_collection.find({'$and': [{'subID':s}, {'dataType':'finalImage'}]}).sort('startTrialTime')    
    # print 'Writing out {} images for subject {}'.format(image_recs.count(),s)

    ## if they made it past the practice trials
    if image_recs.count()>3: 
            for imrec in image_recs:                                                            
                category_dir = os.path.join(sketch_dir,imrec['category'])
                if not os.path.exists(category_dir):
                    os.makedirs(category_dir)
                # filename
                fname = os.path.join(category_dir,'{}_{}_sketch_{}_{}.png'.format(imrec['condition'],imrec['category'], imrec['age'],imrec['sessionId']))
                stroke_recs = this_collection.find({'$and': [{'subID':s}, 
                                  {'dataType':'stroke'},
                                  {'trialNum': imrec['trialNum']}]}).sort('startTrialTime')   


                # don't do adults for now or blank images
                if stroke_recs.count()==0:
                    if imrec['condition']=='P':
                        skipCount_P=skipCount_P+1
                    if imrec['condition']=='S':
                        skipCount_S=skipCount_S+1
                    print 'skipCount p = {}, skipCount S = {}'.format(skipCount_P,skipCount_S)
                elif stroke_recs.count()>0:                                  
                    countImage = countImage + 1;

                    try:
                        # imrec = imrecs[0] # only one image by definition
                        ## check to make sure that there is at least one stroke! 
                        if stroke_recs.count()>0:
                            this_stroke = 0
                            _svg_list = []
                            for strec in stroke_recs:
                                if (strec['svg']): # if not an empty stroke
                                    this_svg = strec['svg']     
                                    if (this_svg in _svg_list):  
                                        print('duplicate svg')
                                    elif this_svg.count(",")==1:
                                        print('point only svg')
                                    else:
                                        this_stroke = this_stroke+1
                                        svg.append(this_svg)
                                        stroke_count.append(this_stroke)
                                  ## Append session ID, trial Num, category, age                            
                                        session_id.append(imrec['sessionId'])        
                                        category.append(imrec['category'])
                                        age.append(imrec['age'])
                                        filename.append(fname) # defined
                                        
                                        ## photodraw2 specific variables
                                        try:
                                            ref_image_name.append(imrec['imageName'])
                                        except:
                                            ref_image_name.append(imrec['category'])
                                            # print 'subbed category for imagename for category {}'.format(imrec['category'])

                                        subID.append(imrec['subID']) #unique identifier
                                        condition.append(imrec['condition']) #semantic or perception
                    

                    except Exception as e:
                            print 'Oops, something went wrong! Here is the error:'  
                            print e
                            pass

                    if (count_subs==5):
                        X_out = pd.DataFrame([session_id, subID, age, category, condition, filename, ref_image_name, stroke_count, svg])
                        X_out = X_out.transpose()
                        X_out.columns = ['session_id','subID','age','category','condition','filename', 'ref_image_name','stroke_count','svg']
                        X_out.to_csv(os.path.join(output_dir, 'CDM_photodraw_e2' + '_svg_output' + '2022.csv'))

                        


X_out = pd.DataFrame([session_id, subID, age, category, condition, filename, ref_image_name, stroke_count, svg])
X_out = X_out.transpose()
X_out.columns = ['session_id','subID','age','category','condition','filename', 'ref_image_name','stroke_count','svg']
X_out.to_csv(os.path.join(output_dir, 'CDM_photodraw_e2' + '_svg_output' + '2022.csv'))
